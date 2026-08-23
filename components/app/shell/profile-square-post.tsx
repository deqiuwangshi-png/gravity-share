/**
 * 个人主页「推荐」Tab 帖卡（client，2026-08-23 内容池归一后改读 square_posts）
 * 头像/昵称/时间（右侧三点菜单）→ 正文（可内联编辑）→ 配图 → 统计行
 * 整卡可点 → /square/[id]；菜单与编辑交互 stopPropagation 防误跳
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { PostMenu } from "@/components/app/common/post-menu";
import { AuthorBadge } from "@/components/app/common/author-badge";
import { SquarePostEditForm } from "@/components/app/square/square-post-edit-form";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { MessageCircle, Heart, Eye } from "lucide-react";
import { publicImageUrl } from "@/lib/storage";
import type { SquarePostDTO } from "@/lib/types";

export function ProfileSquarePost({
  post,
  isSelf,
  onChanged,
}: {
  post: SquarePostDTO;
  isSelf: boolean;
  onChanged?: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const inner = (
    <>
      <div className="profile-post-head">
        <AvatarBox path={post.authorAvatar} name={post.authorName} className="profile-post-avatar" badge={post.authorBadge} authorId={post.authorId} />
        <b>{post.authorName}<AuthorBadge badge={post.authorBadge} /></b>
        <small>{post.time}</small>
        <PostMenu
          targetType="square"
          targetId={post.id}
          isOwner={isSelf}
          content={post.content}
          shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/square/${post.id}`}
          imagePath={post.imageUrl}
          onEdit={() => setEditing(true)}
          onDeleted={onChanged}
        />
      </div>

      {editing ? (
        <SquarePostEditForm
          post={post}
          onDone={() => {
            setEditing(false);
            onChanged?.();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <p className="profile-post-body">{post.content}</p>
      )}

      {post.imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */
        <img className="profile-post-image" src={publicImageUrl("post", post.imageUrl)} alt="帖子配图" />
      )}

      <div className="profile-post-stats">
        <span><Heart size={15} />{post.likes}</span>
        <span><MessageCircle size={15} />{post.comments}</span>
        <span><Eye size={15} />{post.views}</span>
      </div>
    </>
  );

  /* 编辑态渲染为 div（不整卡跳转），常态整卡可点 */
  return editing ? <div className="profile-post editing">{inner}</div> : <Link className="profile-post" href={`/square/${post.id}`}>{inner}</Link>;
}
