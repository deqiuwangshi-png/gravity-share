/**
 * 评论操作菜单（水平三点，client）
 * - 自己的评论：删除 / 复制 / 分享（删除走 RLS comments_owner_delete，成功后刷新列表）
 * - 他人的评论：举报 / 复制 / 分享（举报 MVP 仅反馈，后端 reports 表后续接入）
 * 复制：剪贴板写评论内容；分享：优先 Web Share API，降级复制当前页链接
 * 删除成功后：优先调用 onDeleted（调用方本地刷列表）；否则 router.refresh()（服务端页面重拉）
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MoreIcon } from "./action-icons";
import type { CommentDTO } from "@/lib/types";

export function CommentMenu({
  comment,
  isOwner,
  onDeleted,
}: {
  comment: CommentDTO;
  isOwner: boolean;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  /* 点击外部 / Esc 关闭菜单 */
  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function flash(message: string, ms = 1600) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), ms);
  }

  async function copyText(text: string, okMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(okMessage);
    } catch {
      flash("复制失败");
    }
  }

  async function onDelete() {
    if (busy) return;
    if (!window.confirm("确定删除这条评论吗？")) return;
    setBusy(true);
    const { error } = await createClient().from("comments").delete().eq("id", comment.id);
    setBusy(false);
    setOpen(false);
    if (error) {
      flash("删除失败，请重试");
      return;
    }
    if (onDeleted) onDeleted();
    else router.refresh();
  }

  function onReport() {
    setOpen(false);
    flash("已收到举报，我们会尽快处理", 2000);
  }

  async function onShare() {
    setOpen(false);
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch {
        /* 用户取消分享：静默 */
      }
    }
    await copyText(url, "链接已复制");
  }

  return (
    <div className="comment-menu" ref={ref}>
      <button
        type="button"
        className="comment-menu-btn"
        aria-label="评论操作"
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(!open);
        }}
      >
        <MoreIcon />
      </button>

      {open && (
        <div className="comment-menu-pop" role="menu">
          {isOwner ? (
            <button type="button" role="menuitem" disabled={busy} onClick={(event) => { event.preventDefault(); event.stopPropagation(); void onDelete(); }}>
              删除
            </button>
          ) : (
            <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onReport(); }}>
              举报
            </button>
          )}
          <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(false); void copyText(comment.content, "已复制"); }}>
            复制
          </button>
          <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void onShare(); }}>
            分享
          </button>
        </div>
      )}

      {notice && <span className="comment-menu-notice" role="status">{notice}</span>}
    </div>
  );
}
