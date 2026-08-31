/**
 * SEO 工具层（2026-08-25）：站点 URL 单一来源 + JSON-LD 结构化数据构建
 * 配合 app/robots.ts / app/sitemap.ts / 各页 generateMetadata 使用
 * 零依赖：Next metadata API 原生组合，不引入第三方 SEO 库
 */

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
