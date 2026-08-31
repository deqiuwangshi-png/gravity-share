/**
 * 分类详情页（/categories/[slug]，2026-08-25 SEO：client → server 重构）
 * 分类头（图标+名称+描述+动态计数）→ SquareCard 3 列内容流
 * 服务端预取（爬虫可见 UGC 列表）+ generateMetadata + CollectionPage JSON-LD；
 * 发布实时联动由 SquareRefreshWatcher（client）监听事件触发服务端刷新保留
 * 无效 slug → 404；该分类无内容 → 空态
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchSquarePosts } from "@/lib/queries-posts";
import { SQUARE_CATEGORIES, SQUARE_CATEGORY_META } from "@/lib/config";
import { SITE_URL, buildCollectionPage, jsonLd } from "@/lib/seo";
import { SquareCard } from "@/components/app/common/square-card";
import { SquareRefreshWatcher } from "@/components/app/common/square-refresh-watcher";
import { AdSlot } from "@/components/common/ad-slot";
import { AD_SLOTS } from "@/lib/config";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const catName = SQUARE_CATEGORIES.find((name) => SQUARE_CATEGORY_META[name].slug === slug);
  const meta = catName ? SQUARE_CATEGORY_META[catName] : null;
  return {
    title: catName ? `${catName} · 分类` : "分类不存在",
    description: meta?.desc ?? "引力分类内容",
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const catName = SQUARE_CATEGORIES.find((name) => SQUARE_CATEGORY_META[name].slug === slug);
  const meta = catName ? SQUARE_CATEGORY_META[catName] : null;
  if (!catName || !meta) notFound();

  /* 服务端预取（RLS 公开读）+ 客户端过滤（分类是内容属性） */
  const supabase = await createClient();
  const posts = (await fetchSquarePosts(supabase, 100)).filter((post) => post.category === catName);

  return <div className="app-content">
    <SquareRefreshWatcher />
    <div className="app-feed">
      <Link className="category-back" href="/categories">← 返回全部分类</Link>

      <header className="category-detail-head">
        <span className="category-detail-icon">{meta.icon}</span>
        <div className="category-detail-meta">
          <h1>{catName}</h1>
          <p>{meta.desc}</p>
        </div>
        <span className="category-detail-count">{posts.length} 个内容</span>
      </header>

      {posts.length > 0 ? (
        <>
          <div className="home-grid">{posts.map((post) => <SquareCard post={post} key={post.id} />)}</div>
          {/* A4 广告位：内容列表底部的原生推荐网格（列数与卡片流一致） */}
          <AdSlot slot={AD_SLOTS.category} variant="multiplex" />
        </>
      ) : (
        <p className="category-empty">该分类暂无内容，去「+ 发布」分享第一份好东西。</p>
      )}
    </div>

    {/* CollectionPage 结构化数据（分类枢纽页主题权威，2026-08-25 SEO） */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: jsonLd(buildCollectionPage({ name: catName, description: meta.desc, url: `${SITE_URL}/categories/${slug}` })),
      }}
    />
  </div>;
}
