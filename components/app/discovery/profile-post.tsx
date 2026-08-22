/**
 * 个人主页帖子卡（Twitter/X 风格，client）——推荐/推广内容统一展示
 * 头像 + 昵称 + 时间 → 正文（可内联编辑）→ 圆角链接预览卡 → 数据统计行（赞/评论/浏览，带图标）
 * 右上角统一三点菜单（PostMenu）：本人 删除/修改/复制/分享；他人 举报/复制/分享
 * 整卡可点 → /discover/[id]；菜单与编辑交互 stopPropagation 防误跳
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import type { DiscoveryDTO } from "@/lib/types";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { PostMenu } from "@/components/app/common/post-menu";
import { useToast } from "@/components/app/common/toast";
import { publicImageUrl } from "@/lib/storage";
import { CommentIcon, LikeIcon, ViewIcon } from "@/components/app/common/action-icons";
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

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(body);
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  /** 删除成功：通知首页内容流刷新 + 父组件重拉 */
  function handleDeleted() {
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
      show("保存失败，请重试", "danger");
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
        <PostMenu
          targetType="discovery"
          targetId={item.id}
          isOwner={isSelf}
          content={body}
          shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/discover/${item.id}`}
          imagePath={item.mediaUrl}
          onEdit={() => setEditing(true)}
          onDeleted={handleDeleted}
        />
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
        <p className="promo-note profile-post-promo"><b>⚠ 推广</b> · {item.promoType ?? "推广"}</p>
      )}

      {item.url && (
        <span className="profile-link-preview">
          <span className="profile-link-thumb">
            {item.kind === "image" && item.mediaUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL，seed 直链图原样 */
              <img src={publicImageUrl("post", item.mediaUrl)} alt="" />
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
