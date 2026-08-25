import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/seo";
import { SQUARE_CATEGORY_META } from "@/lib/config";
import { fetchProfileIds, fetchSquarePosts } from "@/lib/queries";

/**
 * sitemap.xml（2026-08-25 SEO 方案 M1）：
 * 静态页 9 + 分类页 12（SQUARE_CATEGORY_META 单一数据源）+ 动态页（square 最新 500 + profile 最新 500）
 * 注意：/discover/[id] 已 301 到 /square/[id]，只列目标 URL
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/help`, changeFrequency: "monthly", priority: 0.5 },
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

  return [...staticEntries, ...categoryEntries, ...squareEntries, ...profileEntries];
}
