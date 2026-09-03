/**
 * 内容三点菜单（统一复用，2026-08-23 合并 CommentMenu）——服务 square_posts 帖子 + comments 评论：
 * targetType：square 帖子 / comment 评论（discoveries 已随 016 内容池归一退役，无写入路径）
 * - 本人：删除（菜单内联确认，无弹窗二次确认）/ 修改（仅内容）/ 复制 / 分享
 * - 他人：举报（MVP 反馈）/ 复制 / 分享
 * 操作反馈统一走全局 toast（底部居中，淡入淡出自动消失）
 * 删除：按 targetType 删对应表（RLS 作者校验），成功后可联动清理配图（imagePath），
 * 再回调 onDeleted（页面跳转 / 列表刷新）；否则 router.refresh()
 * shareUrl 可选：评论等场景缺省取当前页 URL（server 组件调用无需传 window）
 * 定位（2026-09-03 P2）：改接 shadcn DropdownMenu（Radix）——删 @floating-ui/react + 手工点外/Esc
 * 监听 + 容器子节点浮层；Portal 挂 body 脱离卡片 overflow/transform 裁剪；视口避让/键盘导航/互斥关闭
 * 由 Radix 接管。三态内容（主面板 / 删除确认 / 举报原因）用受控 open + view 状态 1:1 复刻：
 * 需保持菜单开启的项（切 view / 异步提交中显示 busy）onSelect preventDefault（Radix 默认 select 即关
 * 闭菜单），关闭型项不 prevent（select 自动关 + 受控 onOpenChange 复位 view）
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { removeImage } from "@/lib/storage";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "./toast";

/** 举报原因（与 /guidelines 红线、/enforcement 专项对齐；举报时必选） */
const REPORT_REASONS = ["违法内容", "侵权内容", "广告推广", "骚扰攻击", "虚假信息", "其他"] as const;

/** 菜单项基础类（原子类化，2026-09-02）；danger 变体独立成串不拼接，避免同属性 hover/text 色冲突 */
const MENU_ITEM_CLASS =
  "w-full cursor-pointer rounded-[7px] border-0 bg-transparent p-[8px_12px] text-left text-[13px] text-foreground transition-[background-color] duration-[180ms] hover:bg-hover disabled:cursor-default disabled:text-disabled [font:inherit]";

const MENU_ITEM_DANGER_CLASS =
  "w-full cursor-pointer rounded-[7px] border-0 bg-transparent p-[8px_12px] text-left text-[13px] font-semibold text-error transition-[background-color] duration-[180ms] hover:bg-error hover:text-on-error disabled:cursor-default disabled:text-disabled [font:inherit]";

/** 举报短 id 生成（模块级函数：规避 react-hooks/purity 对组件内不纯调用的拦截） */
function makeReportId(): string {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 菜单视图（三态内容切换；关闭时经 onOpenChange 复位 main，卸载即重置） */
type MenuView = "main" | "confirm-delete" | "report";

export function PostMenu({
  targetType,
  targetId,
  isOwner,
  content,
  shareUrl,
  imagePath,
  galleryPaths,
  onEdit,
  onDeleted,
}: {
  /** 内容归属：square_posts（话题）| comments（评论）；discoveries 已随内容池归一退役（016） */
  targetType: "square" | "comment";
  targetId: string;
  isOwner: boolean;
  /** 复制用的正文文本 */
  content: string;
  /** 分享用的完整链接（评论等场景缺省取当前页 URL，server 组件调用无需传） */
  shareUrl?: string;
  /** 关联配图存储 path（post 桶），删除时联动清理 */
  imagePath?: string;
  /** 关联图集存储 path 数组（037），删除时与封面一起联动清理 */
  galleryPaths?: string[];
  /** 点「修改」触发（仅本人分支可见） */
  onEdit?: () => void;
  /** 删除成功后回调（跳转 / 刷新） */
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView>("main");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function onDelete() {
    if (busy) return;
    setBusy(true);
    const TABLE: Record<typeof targetType, string> = {
      square: "square_posts",
      comment: "comments",
    };
    const { error } = await createClient().from(TABLE[targetType]).delete().eq("id", targetId);
    setBusy(false);
    setOpen(false);
    if (error) {
      show("删除失败，请重试", "danger");
      return;
    }
    /* 内容已删：配图联动清理（封面 + 图集全部，删图失败静默，避免孤儿文件） */
    [...new Set([...(galleryPaths ?? []), ...(imagePath ? [imagePath] : [])])].forEach((path) =>
      void removeImage("post", path).catch(() => {}),
    );
    show("已删除");
    if (onDeleted) onDeleted();
    else router.refresh();
  }

  /** 举报（2026-08-24：原因必选 → 写 reports 表 → 飞书工作台同步）
   * 写库走 RLS（本人可提交）；飞书同步走 /api/reports/feishu（server 查重 + 写多维表格），失败静默不影响主流程 */
  async function submitReport(reason: string) {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        show("请先登录", "danger");
        return;
      }
      const { error } = await supabase.from("reports").insert({
        id: makeReportId(),
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
      });
      if (error) {
        show("举报失败，请重试", "danger");
        return;
      }
      show("已收到举报，我们会尽快处理");
      /* 同步飞书工作台（fire-and-forget：凭证缺失/不可达均静默） */
      void fetch("/api/reports/feishu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason }),
      }).catch(() => {});
    } catch {
      show("举报失败，请重试", "danger");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      show("已复制");
    } catch {
      show("复制失败", "danger");
    }
  }

  async function onShare() {
    const url = shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
    if (navigator.share) {
      try {
        await navigator.share({ title: content.slice(0, 30), url });
        return;
      } catch {
        /* 用户取消分享：静默 */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      show("链接已复制");
    } catch {
      show("复制失败", "danger");
    }
  }

  return (
    /* DropdownMenu 不渲染根 DOM：ml-auto/shrink-0 移到 Trigger 按钮（原根 div 承载的两端对齐语义） */
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setView("main");
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ml-auto inline-flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-soft transition-[background-color,color] duration-[180ms] hover:bg-hover hover:text-foreground"
          aria-label={targetType === "comment" ? "评论操作" : "内容操作"}
          onClick={(event) => {
            /* 内容卡片整卡可点（跳详情）：阻止冒泡；展开/收起由 Radix Trigger 接管 */
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[108px] rounded-[10px] p-[5px] shadow-panel">
        {view === "confirm-delete" ? (
          <>
            <div className="px-3 pb-[2px] pt-2 text-[12px] text-muted">
              {targetType === "comment" ? "确定删除这条评论？" : "确定删除这条内容？"}
            </div>
            <DropdownMenuItem
              className={MENU_ITEM_DANGER_CLASS}
              disabled={busy}
              onSelect={(event) => {
                /* 保持菜单开启以显示「删除中…」；成功后手动关 */
                event.preventDefault();
                void onDelete();
              }}
            >
              {busy ? "删除中…" : "删除"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={MENU_ITEM_CLASS}
              onSelect={(event) => {
                event.preventDefault();
                setView("main");
              }}
            >
              取消
            </DropdownMenuItem>
          </>
        ) : isOwner ? (
          <>
            <DropdownMenuItem
              className={MENU_ITEM_CLASS}
              onSelect={(event) => {
                event.preventDefault();
                setView("confirm-delete");
              }}
            >
              删除
            </DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => onEdit?.()}>
              修改
            </DropdownMenuItem>
          </>
        ) : view === "report" ? (
          <>
            <div className="px-3 pb-[2px] pt-2 text-[12px] text-muted">选择举报原因</div>
            {REPORT_REASONS.map((reason) => (
              <DropdownMenuItem
                key={reason}
                className={MENU_ITEM_CLASS}
                disabled={busy}
                onSelect={(event) => {
                  /* 保持菜单开启以显示提交中 busy；成功后 finally 手动关 */
                  event.preventDefault();
                  void submitReport(reason);
                }}
              >
                {reason}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className={MENU_ITEM_CLASS}
              onSelect={(event) => {
                event.preventDefault();
                setView("main");
              }}
            >
              取消
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            className={MENU_ITEM_CLASS}
            onSelect={(event) => {
              event.preventDefault();
              setView("report");
            }}
          >
            举报
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => void copy()}>
          复制
        </DropdownMenuItem>
        <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => void onShare()}>
          分享
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
