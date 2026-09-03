/**
 * 个人主页「推荐」Tab 帖卡（client，2026-08-23 内容池归一后改读 square_posts）
 * 头像/昵称/时间（右侧三点菜单）→ 正文（可内联编辑）→ 配图 → 统计行
 * 整卡可点 → /square/[id]；菜单与编辑交互 stopPropagation 防误跳
 * 正文（2026-08-29）：卡片层纯文本预览 + 三行截断（富文本帖 stripHtml 去标签，
 * 与首页/广场列表卡片一致；line-clamp 对富文本块级标签失效，故预览统一纯文本）——点卡片进详情看完整排版
 * 2026-09-02 迁移：profile-post-* 系列原子类化（原 styles/app/profile-posts.css）
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { PostMenu } from "@/components/app/common/post-menu";
import { AuthorBadge } from "@/components/app/common/author-badge";
import { SquarePostEditForm } from "@/components/app/square/square-post-edit-form";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { PostGallery } from "@/components/app/common/post-gallery";
import { MessageCircle, Heart } from "lucide-react";
import { stripHtml } from "@/lib/text";
import { isRichText } from "@/lib/rich-content";
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
      <div className="relative mb-[10px] flex items-center gap-2">
        <AvatarBox path={post.authorAvatar} name={post.authorName} className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary" badge={post.authorBadge} authorId={post.authorId} />
        <b className="text-[13px] font-semibold">{post.authorName}<AuthorBadge badge={post.authorBadge} /></b>
        <small className="text-[11px] text-soft">{post.time}</small>
        <PostMenu
          targetType="square"
          targetId={post.id}
          isOwner={isSelf}
          content={post.content}
          title={post.title}
          url={post.url}
          shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/square/${post.id}`}
          imagePath={post.imageUrl}
          galleryPaths={post.gallery}
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
        /* 卡片层纯文本预览（富文本去标签）+ CSS 三行截断；点卡片进详情看完整内容 */
        <p className="m-0 mb-3 line-clamp-3 whitespace-pre-line break-words text-[14px] leading-[1.7]">{isRichText(post.content) ? stripHtml(post.content) : post.content}</p>
      )}

      {/* 图片（037 图集化）：图集非空 → 网格 + 点击放大；空（旧帖）→ 回退单张封面 */}
      {post.gallery && post.gallery.length > 0 ? (
        <PostGallery paths={post.gallery} />
      ) : (
        post.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */
          <img className="mb-3 block max-h-[260px] w-full rounded-[12px] bg-hover object-cover" src={publicImageUrl("post", post.imageUrl)} alt="帖子配图" />
        )
      )}

      <div className="mt-3 flex gap-[18px] text-[12px] text-soft">
        <span className="inline-flex items-center gap-1"><Heart size={15} />{post.likes}</span>
        <span className="inline-flex items-center gap-1"><MessageCircle size={15} />{post.comments}</span>
      </div>
    </>
  );

  /* 编辑态渲染为 div（不整卡跳转），常态整卡可点 */
  return editing ? <div className="block border-b border-line px-[18px] py-4 transition-[background-color] duration-[180ms] hover:bg-hover">{inner}</div> : <Link className="block border-b border-line px-[18px] py-4 transition-[background-color] duration-[180ms] hover:bg-hover" href={`/square/${post.id}`}>{inner}</Link>;
}
