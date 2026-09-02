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
import { fetchSquarePostsByCategory } from "@/lib/queries-posts";
import { SQUARE_CATEGORIES, SQUARE_CATEGORY_META } from "@/lib/config";
import { SITE_URL, buildCollectionPage, jsonLd } from "@/lib/seo";
import { SquareCard, homeGridClass } from "@/components/app/common/square-card";
import { SquareRefreshWatcher } from "@/components/app/common/square-refresh-watcher";
import { AdSlot } from "@/components/common/ad-slot";
import { AD_SLOTS } from "@/lib/config";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const catName = SQUARE_CATEGORIES.find((name) => SQUARE_CATEGORY_META[name].slug === slug);
  const meta = catName ? SQUARE_CATEGORY_META[catName] : null;
  const title = catName ? `${catName} · 分类` : "分类不存在";
  const description = meta?.desc ?? "引力分类内容";
  return {
    title,
    description,
    alternates: { canonical: `/categories/${slug}` },
    /* P1-3：分类枢纽页补 OG（社交分享 / AI 引用完整卡片） */
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/categories/${slug}`,
      type: "website",
    },
  };
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const catName = SQUARE_CATEGORIES.find((name) => SQUARE_CATEGORY_META[name].slug === slug);
  const meta = catName ? SQUARE_CATEGORY_META[catName] : null;
  if (!catName || !meta) notFound();

  /* 服务端预取（2026-09-02 B：按 category 直查走 026 (category, created_at) 复合索引，
   * 取代「拉最新 100 再内存 filter」——旧实现窗口锁死，分类在最新 100 里只有几条就只显示几条） */
  const supabase = await createClient();
  const posts = await fetchSquarePostsByCategory(supabase, catName);

  return <div className="app-content">
    <SquareRefreshWatcher />
    <div className="min-w-0">
      <Link className="mb-4 inline-block text-[13px] text-muted transition-[color] duration-[180ms] hover:text-primary" href="/categories">← 返回全部分类</Link>

      <header className="mb-[18px] flex items-center gap-[14px] rounded-[14px] border border-line bg-surface p-[18px]">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-[22px] text-primary">{meta.icon}</span>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 mb-1 text-[18px] font-semibold">{catName}</h1>
          <p className="m-0 text-[13px] text-soft">{meta.desc}</p>
        </div>
        <span className="shrink-0 text-[13px] text-muted">{posts.length} 个内容</span>
      </header>

      {posts.length > 0 ? (
        <>
          <div className={homeGridClass}>{posts.map((post) => <SquareCard post={post} key={post.id} />)}</div>
          {/* A4 广告位：内容列表底部的原生推荐网格（列数与卡片流一致） */}
          <AdSlot slot={AD_SLOTS.category} variant="multiplex" />
        </>
      ) : (
        <p className="p-[48px_18px] text-center text-[13px] text-soft">该分类暂无内容，去「+ 发布」分享第一份好东西。</p>
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
