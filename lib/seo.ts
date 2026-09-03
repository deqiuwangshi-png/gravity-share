/**
 * SEO 工具层（2026-08-25）：站点 URL 单一来源 + JSON-LD 结构化数据构建 + 页面级 metadata 构造
 * 配合 app/robots.ts / app/sitemap.ts / 各页 generateMetadata 使用
 * 零第三方依赖：Next metadata API 原生组合
 * 2026-09-03：新增 buildSquarePostSeo（帖子详情页派生收敛），本层依赖 text/post-title/storage 纯函数
 */
import type { Metadata } from "next";
import type { SquarePostDTO } from "@/lib/types";
import { postHeadline } from "@/lib/post-title";
import { stripHtml } from "@/lib/text";
import { publicImageUrl } from "@/lib/storage";
import { deriveProfileDisplay, type ProfileRow } from "@/lib/profile-detail";

/** 站点生产域名（单一来源：.env.local 配 NEXT_PUBLIC_SITE_URL 覆盖，未配置时兜底） */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.yinli.online";

/** JSON-LD 注入安全化：转义 "<" 为 "\u003c"，防 UGC 内容提前闭合 <script>（XSS 面） */
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** 站点/组织实体（根 layout 注入，知识图谱「品牌区」种子） */
export function buildOrganization() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "引力",
    description: "一个开放的发现与连接平台，让分散在互联网各处的价值被更多人发现。",
    url: SITE_URL,
  };
}

/** 网站实体（根 layout 注入） */
export function buildWebSite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "引力",
    url: SITE_URL,
  };
}

/** 个人实体（/profile/[id] 注入，个人品牌区核心：搜昵称出主页） */
export function buildPerson(opts: { name: string; description?: string; url: string; sameAs?: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    url: opts.url,
    ...(opts.sameAs && opts.sameAs.length > 0 ? { sameAs: opts.sameAs } : {}),
  };
}

/** 帖子详情实体（/square/[id] 注入，长尾词入口） */
export function buildArticle(opts: {
  headline: string;
  authorName: string;
  url: string;
  datePublished?: string;
  /** P1-1：正文摘要（与页面 description 同源，前 160 字） */
  description?: string;
  /** P1-1：封面图 URL（有配图才传） */
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.image ? { image: [opts.image] } : {}),
    author: { "@type": "Person", name: opts.authorName },
    url: opts.url,
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    /* P1-1：页面主体声明（声明本页主要实体 = 该帖，防重复内容误判） */
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.url },
  };
}

/** 分类枢纽页实体（/categories/[slug] 注入，主题权威） */
export function buildCollectionPage(opts: { name: string; description?: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    url: opts.url,
  };
}

/**
 * 帖子详情页 SEO 一次派生（2026-09-03 自 app/(app)/square/[id]/page.tsx 迁出）：
 * headline / desc / coverSrc 收敛为单一出处，generateMetadata 与页面主体（H1 + Article JSON-LD）同源消费，
 * 杜绝原 page 内「metadata 与主体各算一遍」的重复漂移（SEO title ≠ H1 风险）。
 * post 为 null（不存在/已删/读不到 → 404）时返回 noindex metadata 与「话题不存在」标题（Next 对 404 已自动 noindex，此为双保险）。
 */
export function buildSquarePostSeo(
  post: SquarePostDTO | null,
  id: string,
): {
  metadata: Metadata;
  /** H1 文案（与 metadata title 同源，页面 <h1> 直接消费） */
  headline: string;
  /** Article JSON-LD 实体（含 @context；页面 jsonLd() 序列化注入；null = 帖子不存在无结构化数据） */
  article: ReturnType<typeof buildArticle> | null;
} {
  /* 标题提炼（P0-1，L1-L4 流水线）：用户标题 > 正文实体 > 分类 > 作者兜底 */
  const headline = post
    ? postHeadline({
        title: post.title,
        content: post.content,
        category: post.category,
        tags: post.tags,
        url: post.url,
        authorName: post.authorName,
        postType: post.postType,
      })
    : "话题不存在";
  /* 摘要：与卡片 preview 同长度口径（stripHtml 前 160 字），空正文回退标题 */
  const desc = post ? stripHtml(post.content).slice(0, 160) || headline : "";
  /* OG/卡片配图：有配图（封面/图集首张）输出；无图不填（不造默认图） */
  const coverSrc = post?.imageUrl ? publicImageUrl("post", post.imageUrl) : undefined;
  const metadata: Metadata = {
    title: headline,
    description: desc,
    /* 索引策略显式声明（2026-09-02，GSC noindex 排查收尾）：
       帖子存在且 anon 可读（200 + 全文 SSR）→ index, follow；
       null（走 notFound 404）→ noindex, nofollow（双保险） */
    robots: post ? { index: true, follow: true } : { index: false, follow: false },
    alternates: { canonical: `/square/${id}` },
    openGraph: {
      title: headline,
      description: desc,
      type: "article",
      url: `${SITE_URL}/square/${id}`,
      ...(coverSrc ? { images: [{ url: coverSrc }] } : {}),
    },
    twitter: {
      /* 2026-09-03 SEO 收尾 A：X/Twitter 卡片补全（有图大图卡，无图纯文字卡不造假图） */
      card: coverSrc ? "summary_large_image" : "summary",
      title: headline,
      description: desc,
      ...(coverSrc ? { images: [coverSrc] } : {}),
    },
  };
  const article = post
    ? buildArticle({
        headline,
        authorName: post.authorName,
        url: `${SITE_URL}/square/${post.id}`,
        datePublished: post.createdAt,
        description: desc,
        image: coverSrc,
      })
    : null;
  return { metadata, headline, article };
}

/**
 * 他人主页页 SEO 一次派生（2026-09-03 自 app/(app)/profile/[id]/page.tsx 迁出）：
 * 展示名 / bio / OG 头像收敛为单一出处（deriveProfileDisplay，name 兜底规则唯一），
 * generateMetadata 与页面主体（Person JSON-LD + ProfileView 传参）同源消费，
 * 杜绝原 page 内「metadata 与主体各算一遍」的重复漂移。
 * profile 为 null（用户不存在 → 404）时返回 noindex metadata 与 null person
 * （Next 对 404 已自动 noindex，此为双保险，与 buildSquarePostSeo 同策略）。
 */
export function buildProfileSeo(
  profile: ProfileRow | null,
  id: string,
): {
  metadata: Metadata;
  /** 展示派生结果（name/bio/avatarUrl/coverUrl/badge 一次产出，ProfileView 直接消费） */
  display: ReturnType<typeof deriveProfileDisplay>;
  /** Person JSON-LD 实体（含 @context；null = 用户不存在无结构化数据） */
  person: ReturnType<typeof buildPerson> | null;
} {
  /* 他人页语境无 self 兜底（user_metadata/email 仅本人可得），name 规则走 deriveProfileDisplay 单一出处 */
  const display = deriveProfileDisplay(profile);
  const title = profile ? `${display.name} 的个人主页` : "用户不存在";
  const description = display.bio || `${display.name} 在引力分享的内容`;
  /* OG 头像：storage path 拼接；OAuth 外链原样（与迁移前一致） */
  const ogImage = display.avatarUrl ? publicImageUrl("avatar", display.avatarUrl) : undefined;
  const metadata: Metadata = {
    title,
    description,
    robots: profile ? { index: true, follow: true } : { index: false, follow: false },
    alternates: { canonical: `/profile/${id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/profile/${id}`,
      type: "profile",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
  const person = profile
    ? buildPerson({
        name: display.name,
        description: display.bio || undefined,
        url: `${SITE_URL}/profile/${id}`,
      })
    : null;
  return { metadata, display, person };
}
