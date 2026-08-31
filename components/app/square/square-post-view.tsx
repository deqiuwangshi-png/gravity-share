/**
 * 广场详情页帖子主体（client）：发帖头（头像/昵称/时间 + 三点菜单）→ 正文（可内联编辑）
 * → 配图（可编辑）→ 标签
 * 菜单：统一 PostMenu（本人 删除/修改/复制/分享；他人 举报/复制/分享）
 * 修改：内联编辑表单（正文 + 链接 + 配图，SquarePostEditForm）；删除成功跳回首页（2026-08-27 广场并入首页）
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PostMenu } from "@/components/app/common/post-menu";
import { SquarePostEditForm } from "./square-post-edit-form";
import { AuthorLink } from "@/components/app/common/author-link";
import { AuthorBadge } from "@/components/app/common/author-badge";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { LinkifiedText } from "@/components/app/common/linkified-text";
import { RichContent } from "@/components/app/common/rich-content";
import { isRichText } from "@/lib/rich-content";
import { publicImageUrl } from "@/lib/storage";
import { sanitizeUrl } from "@/lib/url-policy";
import { safeHref } from "@/lib/links";
import type { SquarePostDTO } from "@/lib/types";

export function SquarePostView({ post, isOwner }: { post: SquarePostDTO; isOwner: boolean }) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  /* 修复「填了网址不显示」：url 字段入库但从未渲染；正文已含该链接时不重复展示
   * 2026-08-24 安全加固：sanitizeUrl 入库即标准化（协议白名单/拒内网），失败为 null 不渲染；
   * linkHref 走 /go 网关，失败亦不渲染——不再回退原始值（防 javascript:/data: 绕过） */
  const linkUrl = post.url && !post.content.includes(post.url) ? sanitizeUrl(post.url) : null;
  const linkHref = linkUrl ? safeHref(linkUrl) : null;

  return (
    <>
      <div className="square-post-head">
        <AvatarBox path={post.authorAvatar} name={post.authorName} className="square-avatar" badge={post.authorBadge} authorId={post.authorId} />
        <div className="square-post-meta">
          <strong><AuthorLink authorId={post.authorId} name={post.authorName} /><AuthorBadge badge={post.authorBadge} /></strong>
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
          onDeleted={() => router.replace("/home")}
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
          {/* 正文：富文本（sanitize 渲染）/ 纯文本（存量或短帖） */}
          {isRichText(post.content) ? (
            <RichContent content={post.content} />
          ) : (
            <p className="square-content"><LinkifiedText text={post.content} /></p>
          )}
          {post.urlStatus === "blocked" ? (
            <p className="square-post-link-removed">该链接已被移除</p>
          ) : (
            linkHref && (
              <a className="square-post-link" href={linkHref} target="_blank" rel="noopener noreferrer">
                原文链接：{post.url}
              </a>
            )
          )}
          {/* 2026-08-31：正文富文本已含 <img>（图集插入）时不再单独显示封面图，防重复展示；
              图集第 1 张仍写入 image_url 供卡片/列表作封面 */}
          {post.imageUrl && !post.content.includes("<img") && (
            /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */
            <img className="square-post-image" src={publicImageUrl("post", post.imageUrl)} alt="帖子配图" />
          )}
          {post.postType === "opportunity" && (
            <p className="square-post-notice opportunity"><b>⚠ 机会</b>{post.commission ? ` · ${post.commission}` : ""}</p>
          )}
          {post.postType === "content" && post.sourcePlatform && (
            <p className="square-post-notice source">来源：{post.sourcePlatform}</p>
          )}
        </>
      )}

      <div className="square-tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
    </>
  );
}
