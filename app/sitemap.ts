import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo";
import { SQUARE_CATEGORY_META } from "@/lib/config";
import { fetchProfileIds, fetchSquarePosts } from "@/lib/queries/posts";

/**
 * sitemap.xml（2026-08-25 SEO 方案 M1）：
 * 静态页 8 + 分类页 12（SQUARE_CATEGORY_META 单一数据源）+ 动态页（square 最新 500 + profile 最新 500）
 * 注意：/discover/[id] 已 301 到 /square/[id]，只列目标 URL；/help 已删（2026-09-03 FAQ 承接）
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/governance`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/guidelines`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/enforcement`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/disclaimer`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  /* 分类页：SQUARE_CATEGORY_META 单一数据源（12 个主题枢纽页） */
  const categoryEntries: MetadataRoute.Sitemap = Object.values(SQUARE_CATEGORY_META).map((meta) => ({
    url: `${SITE_URL}/categories/${meta.slug}`,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  /* 动态页：匿名只读客户端（RLS 公开读策略），各限 500 条防 sitemap 膨胀 */
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const [posts, profiles] = await Promise.all([
    fetchSquarePosts(supabase, 500),
    fetchProfileIds(supabase, 500),
  ]);

  const squareEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/square/${post.id}`,
    lastModified: new Date(post.createdAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const profileEntries: MetadataRoute.Sitemap = profiles.map((profile) => ({
    url: `${SITE_URL}/profile/${profile.id}`,
    lastModified: new Date(profile.createdAt),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  /* P1-5 标签条目：复用已拉 posts 聚合 tags（零额外查询），出现 ≥3 次的标签生成 /tag/{编码} 条目
   * ——与标签页 noindex 阈值（<3 noindex）严格一致，低质标签不进 sitemap */
  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const tagEntries: MetadataRoute.Sitemap = [...tagCounts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([tag]) => ({
      url: `${SITE_URL}/tag/${encodeURIComponent(tag)}`,
      changeFrequency: "weekly",
      priority: 0.5,
    }));

  return [...staticEntries, ...categoryEntries, ...squareEntries, ...profileEntries, ...tagEntries];
}
