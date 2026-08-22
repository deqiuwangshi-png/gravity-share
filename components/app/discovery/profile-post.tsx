/**
 * 个人主页帖子卡（Twitter/X 风格，client）
 * 头像 + 昵称 + 时间 → 正文（可内联编辑）→ 圆角链接预览卡 → 数据统计行（赞/评论/浏览，带图标）
 * 本人视角（isSelf）右上角水平三点菜单：删除 / 修改（内联编辑正文）/ 复制 / 分享
 * 整卡可点 → /discover/[id]；菜单与编辑交互 stopPropagation 防误跳
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import type { DiscoveryDTO } from "@/lib/types";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { CommentIcon, LikeIcon, MoreIcon, ViewIcon } from "@/components/app/common/action-icons";
import { createClient } from "@/lib/supabase/client";
import { DISCOVERY_UPDATED_EVENT } from "@/lib/queries";

export function ProfilePost({
  item,
  isSelf = false,
  onChanged,
}: {
  item: DiscoveryDTO;
  isSelf?: boolean;
  onChanged?: () => void;
}) {
  const body = item.note ?? item.description ?? "";
  const linkTitle = item.title ?? body.slice(0, 30);
  const linkDesc = item.description && item.description !== item.note ? item.description : undefined;
  const kindMark = item.kind === "video" ? "▶ 视频" : item.kind === "doc" ? "DOC" : "链接";

  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(body);
  const [busy, setBusy] = useState(false);

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

  async function onShare() {
    setMenuOpen(false);
    const url = `${window.location.origin}/discover/${item.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.note ?? item.title ?? "", url });
        return;
      } catch {
        /* 用户取消：静默 */
      }
    }
    await copyText(url, "链接已复制");
  }

  async function onDelete() {
    setMenuOpen(false);
    if (!window.confirm("确定删除这条内容吗？删除后不可恢复。")) return;
    setBusy(true);
    const { error } = await createClient().from("discoveries").delete().eq("id", item.id);
    setBusy(false);
    if (error) {
      flash("删除失败，请重试");
      return;
    }
    window.dispatchEvent(new Event(DISCOVERY_UPDATED_EVENT));
    onChanged?.();
  }

  async function onSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = editText.trim();
    if (!text || busy) return;
    setBusy(true);
    const { error } = await createClient().from("discoveries").update({ note: text }).eq("id", item.id);
    setBusy(false);
    if (error) {
      flash("保存失败，请重试");
      return;
    }
    setEditing(false);
    onChanged?.();
  }

  const stats = (
    <div className="profile-post-stats">
      <span><LikeIcon />{item.likes}</span>
      <span><CommentIcon />{item.comments}</span>
      <span><ViewIcon />{item.views}</span>
    </div>
  );

  const inner = (
    <>
      <div className="profile-post-head">
        <AvatarBox path={item.authorAvatar} name={item.authorName ?? "推"} className="profile-post-avatar" authorId={item.authorId} />
        <b>{item.authorName ?? "引力推荐"}</b>
        <small>{item.time ?? ""}</small>
        {isSelf && (
          <span className="profile-post-menu">
            <button
              type="button"
              className="comment-menu-btn"
              aria-label="内容操作"
              aria-expanded={menuOpen}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
            ><MoreIcon /></button>
            {menuOpen && (
              <span className="comment-menu-pop" role="menu" onClick={(event) => event.stopPropagation()}>
                <button type="button" role="menuitem" disabled={busy} onClick={(event) => { event.preventDefault(); event.stopPropagation(); void onDelete(); }}>删除</button>
                <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenuOpen(false); setEditing(true); }}>修改</button>
                <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMenuOpen(false); void copyText(body, "已复制"); }}>复制</button>
                <button type="button" role="menuitem" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void onShare(); }}>分享</button>
              </span>
            )}
            {notice && <span className="comment-menu-notice" role="status">{notice}</span>}
          </span>
        )}
      </div>

      {editing ? (
        <form className="profile-post-edit" onSubmit={(event) => void onSaveEdit(event)} onClick={(event) => event.stopPropagation()}>
          <textarea rows={4} value={editText} onChange={(event) => setEditText(event.target.value)} aria-label="编辑正文" autoFocus />
          <div className="profile-post-edit-actions">
            <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setEditing(false); setEditText(body); }}>取消</button>
            <button type="submit" disabled={busy || !editText.trim()}>{busy ? "保存中…" : "保存"}</button>
          </div>
        </form>
      ) : (
        <p className="profile-post-body">{body}</p>
      )}

      {item.commercial && (
        <p className="promo-note profile-post-promo"><b>⚠ 推广</b> · {item.promoType ?? "推广"} · 风险自判</p>
      )}

      {item.url && (
        <span className="profile-link-preview">
          <span className="profile-link-thumb">
            {item.kind === "image" && item.mediaUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- mock 直链图 */
              <img src={item.mediaUrl} alt="" />
            ) : (
              <span className="profile-link-mark">{kindMark}</span>
            )}
          </span>
          <span className="profile-link-body">
            <b>{linkTitle}</b>
            {linkDesc && <small>{linkDesc}</small>}
          </span>
        </span>
      )}

      {stats}
    </>
  );

  /* 编辑态渲染为 div（不整卡跳转），常态整卡可点 */
  return editing ? <div className="profile-post editing">{inner}</div> : <Link className="profile-post" href={`/discover/${item.id}`}>{inner}</Link>;
}
