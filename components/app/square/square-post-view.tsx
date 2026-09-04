/**
 * 广场详情页帖子主体（client）：发帖头（头像/昵称/时间 + 三点菜单）→ 正文（可内联编辑）
 * → 配图（可编辑）→ 标签
 * 菜单：统一 PostMenu（本人 删除/修改/复制/分享；他人 举报/复制/分享）
 * 修改：内联编辑表单（正文 + 链接 + 配图，SquarePostEditForm）；删除成功跳回首页（2026-08-27 广场并入首页）
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PostMenu } from "@/components/app/common/post-menu";
import { SquarePostEditForm } from "./square-post-edit-form";
import { AuthorLink } from "@/components/app/common/author-link";
import { AuthorBadge } from "@/components/app/common/author-badge";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { LinkifiedText } from "@/components/app/common/linkified-text";
import { PostGallery } from "@/components/app/common/post-gallery";
import { ExternalLinkCards } from "@/components/app/common/external-link-card";
import { extractPlainTextLinks, mergeExternalLinks } from "@/lib/external-links";
import { isRichText, sanitizeHtmlForRenderWithLinks } from "@/lib/rich-content";
import { publicImageUrl } from "@/lib/storage";
import { SQUARE_CATEGORY_META } from "@/lib/config";
import { postHeadline } from "@/lib/post-title";
import type { SquarePostDTO } from "@/lib/types";

export function SquarePostView({ post, isOwner }: { post: SquarePostDTO; isOwner: boolean }) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  /* 修复「填了网址不显示」：url 字段入库但从未渲染；正文已含该链接时不重复展示
   * 2026-08-24 安全加固：sanitizeUrl 入库即标准化（协议白名单/拒内网），失败为 null 不渲染；
   * linkHref 走 /go 网关，失败亦不渲染——不再回退原始值（防 javascript:/data: 绕过） */
  /* P1-4：封面 = image_url；若封面图已插入正文（精确 URL 匹配）则不重复显示，否则显示。
     用精确 URL 替代脆弱的 "<img" 字面量判断；与 feed 卡片始终用 image_url 作封面对齐。 */
  const coverSrc = post.imageUrl ? publicImageUrl("post", post.imageUrl) : null;
  const coverInBody = coverSrc ? post.content.includes(coverSrc) : false;
  /* P1-7：封面 alt 语义化——用标题提炼结果（与 H1/SEO title/Article headline 同源），弃用泛化「帖子配图」 */
  const coverAlt = postHeadline({
    title: post.title,
    content: post.content,
    category: post.category,
    url: post.url,
    authorName: post.authorName,
    postType: post.postType,
  });
  const richContent = isRichText(post.content) ? sanitizeHtmlForRenderWithLinks(post.content) : null;
  const externalLinks = mergeExternalLinks(richContent?.links ?? extractPlainTextLinks(post.content), post.urlStatus === "blocked" ? null : post.url);

  return (
    <>
      <div className="mb-[14px] flex items-center gap-[10px]">
        <AvatarBox path={post.authorAvatar} name={post.authorName} className="grid size-[30px] shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary" badge={post.authorBadge} authorId={post.authorId} link />
        <div>
          <strong className="block text-[13px]"><AuthorLink link authorId={post.authorId} name={post.authorName} /><AuthorBadge badge={post.authorBadge} /></strong>
          <small className="mt-[2px] block text-[11px] text-soft">{post.time}</small>
        </div>
        <PostMenu
          targetType="square"
          targetId={post.id}
          isOwner={isOwner}
          content={post.content}
          title={post.title}
          url={post.url}
          shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/square/${post.id}`}
          imagePath={post.imageUrl}
          galleryPaths={post.gallery}
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
          {richContent ? (
            <div className="rich-content" dangerouslySetInnerHTML={{ __html: richContent.html }} />
          ) : (
            <p className="m-0 whitespace-pre-line text-[15px] leading-[1.85] text-foreground"><LinkifiedText text={post.content} interactive={false} /></p>
          )}
          <ExternalLinkCards links={externalLinks} />
          {post.urlStatus === "blocked" && (
            <p className="m-0 mt-[10px] text-[12px] italic text-soft">该链接已被移除</p>
          )}
          {/* 图片（037 图集化）：图集非空 → 底部网格 + 点击放大；空（旧帖）→ 回退封面图
              封面（image_url）已入正文则不重复显示，避免与图集首图重复 */}
          {post.gallery && post.gallery.length > 0 ? (
            <PostGallery paths={post.gallery} />
          ) : (
            coverSrc && !coverInBody && (
              /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */
              <img className="mt-[14px] block max-h-[420px] w-full rounded-[12px] bg-hover object-cover" src={coverSrc} alt={coverAlt} />
            )
          )}
          {post.postType === "opportunity" && (
            <p className="mt-2 border-t border-dashed border-line pt-2 text-[11px] leading-[1.6] text-muted"><b className="font-semibold text-accent-warn">⚠ 机会</b>{post.commission ? ` · ${post.commission}` : ""}</p>
          )}
          {post.postType === "content" && post.sourcePlatform && (
            <p className="mt-2 border-t border-dashed border-line pt-2 text-[11px] leading-[1.6] text-soft">来源：{post.sourcePlatform}</p>
          )}
        </>
      )}

      {/* P0-5/P0-7 内部链接网络：分类 → /categories/{slug}；标签 → /tag/{编码}（真链接，爬虫可沿链接发现） */}
      <div className="mt-3 flex flex-wrap gap-[6px]">
        {SQUARE_CATEGORY_META[post.category] && (
          <Link className="rounded-[5px] bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary no-underline transition-[color,background-color] duration-[180ms] hover:bg-primary-subtle hover:text-primary-dark" href={`/categories/${SQUARE_CATEGORY_META[post.category].slug}`}>
            {post.category}
          </Link>
        )}
        {post.tags.map((tag) => (
          <Link key={tag} className="rounded-[5px] bg-hover px-2 py-1 text-[11px] text-muted no-underline transition-[color,background-color] duration-[180ms] hover:bg-primary-soft hover:text-primary" href={`/tag/${encodeURIComponent(tag)}`}>{tag}</Link>
        ))}
      </div>
    </>
  );
}
