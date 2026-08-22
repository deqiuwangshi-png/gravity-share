/**
 * 个人主页广场帖卡（client）——头像/昵称/时间（右侧三点菜单）→ 正文（可内联编辑）
 * → 配图 → 统计行（赞/评论/浏览，带图标）
 * 整卡可点 → /square/[id]；菜单与编辑交互 stopPropagation 防误跳
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { PostMenu } from "@/components/app/common/post-menu";
import { SquarePostEditForm } from "./square-post-edit-form";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { CommentIcon, LikeIcon, ViewIcon } from "@/components/app/common/action-icons";
import { publicImageUrl } from "@/lib/storage";
import type { SquarePostDTO } from "@/lib/types";

export function SquareProfilePost({
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
      <div className="square-profile-post-head">
        <AvatarBox path={post.authorAvatar} name={post.authorName} className="square-profile-post-avatar" authorId={post.authorId} />
        <b>{post.authorName}</b>
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
        <p className="square-profile-post-body">{post.content}</p>
      )}

      {post.imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */
        <img className="square-profile-post-image" src={publicImageUrl("post", post.imageUrl)} alt="帖子配图" />
      )}

      <div className="square-profile-post-stats">
        <span><LikeIcon />{post.likes}</span>
        <span><CommentIcon />{post.comments}</span>
        <span><ViewIcon />{post.views}</span>
      </div>
    </>
  );

  /* 编辑态渲染为 div（不整卡跳转），常态整卡可点 */
  return editing ? <div className="square-profile-post editing">{inner}</div> : <Link className="square-profile-post" href={`/square/${post.id}`}>{inner}</Link>;
}
