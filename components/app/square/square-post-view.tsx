/**
 * 广场详情页帖子主体（client）：发帖头（头像/昵称/时间 + 三点菜单）→ 正文（可内联编辑）
 * → 配图（可编辑）→ 标签
 * 菜单：统一 PostMenu（本人 删除/修改/复制/分享；他人 举报/复制/分享）
 * 修改：内联编辑表单（正文 + 链接 + 配图，SquarePostEditForm）；删除成功跳回广场列表
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PostMenu } from "@/components/app/common/post-menu";
import { SquarePostEditForm } from "./square-post-edit-form";
import { AuthorLink } from "@/components/app/common/author-link";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { LinkifiedText } from "@/components/app/common/linkified-text";
import { publicImageUrl } from "@/lib/storage";
import type { SquarePostDTO } from "@/lib/types";

export function SquarePostView({ post, isOwner }: { post: SquarePostDTO; isOwner: boolean }) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="square-post-head">
        <AvatarBox path={post.authorAvatar} name={post.authorName} className="square-avatar" authorId={post.authorId} />
        <div className="square-post-meta">
          <strong><AuthorLink authorId={post.authorId} name={post.authorName} /></strong>
          <small>{post.time}</small>
        </div>
        <PostMenu
          targetType="square"
          targetId={post.id}
          isOwner={isOwner}
          content={post.content}
          shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/square/${post.id}`}
          imagePath={post.imageUrl}
          onEdit={() => setEditing(true)}
          onDeleted={() => router.replace("/square")}
        />
      </div>

      {editing ? (
        <SquarePostEditForm
          post={post}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <p className="square-content"><LinkifiedText text={post.content} /></p>
          {post.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */
            <img className="square-post-image" src={publicImageUrl("post", post.imageUrl)} alt="帖子配图" />
          )}
        </>
      )}

      <div className="square-tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    </>
  );
}
