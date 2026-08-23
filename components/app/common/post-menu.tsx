/**
 * 内容三点菜单（统一复用，2026-08-23 合并 CommentMenu）——覆盖【+发布】三入口 + 评论：
 * 推荐好东西 / 商业推广 → discoveries；话题帖子 → square_posts；评论 → comments
 * - 本人：删除（菜单内联确认，无弹窗二次确认）/ 修改（仅内容）/ 复制 / 分享
 * - 他人：举报（MVP 反馈）/ 复制 / 分享
 * 操作反馈统一走全局 toast（底部居中，淡入淡出自动消失）
 * 删除：按 targetType 删对应表（RLS 作者校验），成功后可联动清理配图（imagePath），
 * 再回调 onDeleted（页面跳转 / 列表刷新）；否则 router.refresh()
 * shareUrl 可选：评论等场景缺省取当前页 URL（server 组件调用无需传 window）
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { removeImage } from "@/lib/storage";
import { MoreHorizontal } from "lucide-react";
import { useToast } from "./toast";

export function PostMenu({
  targetType,
  targetId,
  isOwner,
  content,
  shareUrl,
  imagePath,
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
  /** 点「修改」触发（仅本人分支可见） */
  onEdit?: () => void;
  /** 删除成功后回调（跳转 / 刷新） */
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { show } = useToast();

  /* 点击外部 / Esc 关闭菜单 */
  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setConfirming(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    setOpen((prev) => {
      if (prev) setConfirming(false);
      return !prev;
    });
  }

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
    setConfirming(false);
    if (error) {
      show("删除失败，请重试", "danger");
      return;
    }
    /* 内容已删：配图联动清理（删图失败静默，避免孤儿文件） */
    if (imagePath) void removeImage("post", imagePath);
    show("已删除");
    if (onDeleted) onDeleted();
    else router.refresh();
  }

  /** 举报（V7 真实落地：写 reports 表，RLS 本人可提交；处置走 Table Editor/后台） */
  async function onReport() {
    setOpen(false);
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
        id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
      });
      if (error) {
        show("举报失败，请重试", "danger");
        return;
      }
      show("已收到举报，我们会尽快处理");
    } catch {
      show("举报失败，请重试", "danger");
    }
  }

  async function copy() {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(content);
      show("已复制");
    } catch {
      show("复制失败", "danger");
    }
  }

  async function onShare() {
    setOpen(false);
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
    <div className="comment-menu" ref={ref}>
      <button
        type="button"
        className="comment-menu-btn"
        aria-label={targetType === "comment" ? "评论操作" : "内容操作"}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          toggle();
        }}
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="comment-menu-pop" role="menu">
          {confirming ? (
            <>
              <div className="comment-menu-confirm">{targetType === "comment" ? "确定删除这条评论？" : "确定删除这条内容？"}</div>
              <button
                type="button"
                role="menuitem"
                className="comment-menu-danger"
                disabled={busy}
                onClick={(event) => { event.preventDefault(); event.stopPropagation(); void onDelete(); }}
              >{busy ? "删除中…" : "删除"}</button>
              <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setConfirming(false); }}>
                取消
              </button>
            </>
          ) : isOwner ? (
            <>
              <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setConfirming(true); }}>
                删除
              </button>
              <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(false); onEdit?.(); }}>
                修改
              </button>
            </>
          ) : (
            <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onReport(); }}>
              举报
            </button>
          )}
          <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void copy(); }}>
            复制
          </button>
          <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void onShare(); }}>
            分享
          </button>
        </div>
      )}
    </div>
  );
}
