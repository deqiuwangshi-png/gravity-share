/**
 * 内容三点菜单（统一复用，2026-08-23 合并 CommentMenu）——服务 square_posts 帖子 + comments 评论：
 * targetType：square 帖子 / comment 评论（discoveries 已随 016 内容池归一退役，无写入路径）
 * - 本人：删除（菜单内联确认，无弹窗二次确认）/ 修改（仅内容）/ 复制 / 分享
 * - 他人：举报（2026-09-03 改独立 Dialog 弹窗，见 report-dialog.tsx）/ 复制 / 分享
 * 操作反馈统一走全局 toast（底部居中，淡入淡出自动消失）
 * 职责分层（2026-09-03，见 AGENTS.md「组件职责分层」）：写库动作已下沉 lib/content-actions（删除）
 * 与 lib/share（分享），复制文本组装在 lib/content-text + lib/clipboard；本组件只保留菜单 UI
 * （两态视图 + busy）与 toast / 导航 / onDeleted 回调编排
 * shareUrl 可选：评论等场景缺省取当前页 URL（server 组件调用无需传 window）
 * 定位（2026-09-03 P2）：shadcn DropdownMenu（Radix）——Portal 挂 body 脱离卡片 overflow/transform
 * 裁剪；视口避让/键盘导航/互斥关闭由 Radix 接管。两态内容（主面板 / 删除确认）受控 open + view 状态：
 * 需保持菜单开启的项（切 view / 异步提交中 busy）onSelect preventDefault（Radix 默认 select 即关），
 * 关闭型项不 prevent（select 自动关 + 受控 onOpenChange 复位 view）；「举报」关闭菜单后由
 * ReportDialog（独立 open state）接管，互不干扰
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteContent, type ContentTarget } from "@/lib/content-actions";
import { createClient } from "@/lib/supabase/client";
import { ReportDialog } from "./report-dialog";
import { useToast } from "./toast";
import { postCopyText } from "@/lib/content-text";
import { copyTextToClipboard } from "@/lib/clipboard";
import { shareContentUrl } from "@/lib/share";

/** 菜单项基础类（原子类化，2026-09-02）；danger 变体独立成串不拼接，避免同属性 hover/text 色冲突 */
const MENU_ITEM_CLASS =
  "w-full cursor-pointer rounded-[7px] border-0 bg-transparent p-[8px_12px] text-left text-[13px] text-foreground transition-[background-color] duration-[180ms] hover:bg-hover disabled:cursor-default disabled:text-disabled [font:inherit]";

const MENU_ITEM_DANGER_CLASS =
  "w-full cursor-pointer rounded-[7px] border-0 bg-transparent p-[8px_12px] text-left text-[13px] font-semibold text-error transition-[background-color] duration-[180ms] hover:bg-error hover:text-on-error disabled:cursor-default disabled:text-disabled [font:inherit]";

/** 菜单视图（主面板 / 删除确认 两态；举报已外移 Dialog。关闭时经 onOpenChange 复位 main） */
type MenuView = "main" | "confirm-delete";

export function PostMenu({
  targetType,
  targetId,
  isOwner,
  content,
  title,
  url,
  shareUrl,
  imagePath,
  galleryPaths,
  onEdit,
  onDeleted,
}: {
  /** 内容归属：square_posts（话题）| comments（评论）；discoveries 已随内容池归一退役（016） */
  targetType: ContentTarget;
  targetId: string;
  isOwner: boolean;
  /** 复制用的正文文本（举报弹窗回显摘要亦取自它，经 stripHtml 截断） */
  content: string;
  /** 帖子显式标题（038，square 专用；评论不传）——复制内容时与正文组装成纯文本（见 lib/content-text.ts postCopyText） */
  title?: string;
  /** 帖子原文链接（square 专用；正文未含时附加到复制文本尾部，防推荐帖链接丢失） */
  url?: string;
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
  const [reportOpen, setReportOpen] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  async function onDelete() {
    if (busy) return;
    setBusy(true);
    /* 数据动作（写库 + 配图清理）在 lib/content-actions；组件只做反馈与导航编排 */
    const { ok } = await deleteContent(createClient(), { targetType, targetId, imagePath, galleryPaths });
    setBusy(false);
    setOpen(false);
    if (!ok) {
      show("删除失败，请重试", "danger");
      return;
    }
    show("已删除");
    if (onDeleted) onDeleted();
    else router.refresh();
  }

  async function copy() {
    /* 帖子 = 复制「内容本体」（作者标题 + 正文纯文本 + 链接，2026-09-03 C 修正：此前富文本帖会把
       HTML 源码原样复制进剪贴板）；评论正文本就纯文本，原样复制 */
    const text = targetType === "square" ? postCopyText({ title, content, url }) : content;
    const ok = await copyTextToClipboard(text);
    show(ok ? "已复制" : "复制失败", ok ? undefined : "danger");
  }

  async function onShare() {
    const link = shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
    /* 分享/复制编排在 lib/share；toast 按结果反馈 */
    const result = await shareContentUrl({ title: content.slice(0, 30), url: link });
    if (result === "copied") show("链接已复制");
    else if (result === "failed") show("复制失败", "danger");
  }

  return (
    /* DropdownMenu 不渲染根 DOM：ml-auto/shrink-0 移到 Trigger 按钮（原根 div 承载的两端对齐语义） */
    <>
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
          ) : (
            /* 举报：select 即关菜单（onOpenChange 复位 view），ReportDialog 独立受控接管 */
            <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={() => setReportOpen(true)}>
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

      {/* 举报弹窗：非本人分支可见项；仅他人分支会触发 open */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType={targetType}
        targetId={targetId}
        content={content}
      />
    </>
  );
}
