/**
 * 分类详情页（/categories/[slug]，2026-09-03 架构拆分后）——只做「编排」：
 * 数据获取 → lib/category-detail.ts（resolveCategoryMeta + loadCategoryDetail）
 * 本文件仅剩：import + 组装 + JSX 布局，不再内联任何数据访问或 config 派生。
 * 索引策略：无效 slug → notFound 404；该分类无内容 → 空态提示（非 404）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadCategoryDetail, resolveCategoryMeta } from "@/lib/category-detail";
import { SITE_URL, buildCollectionPage, jsonLd } from "@/lib/seo";
import { SquareCard, homeGridClass } from "@/components/app/common/square-card";
import { SquareRefreshWatcher } from "@/components/app/common/square-refresh-watcher";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  /* resolveCategoryMeta（纯函数，lib 层）：metadata 与主体同源解析，无效 slug → 「分类不存在」标题 */
  const cat = resolveCategoryMeta(slug);
  const title = cat ? `${cat.name} · 分类` : "分类不存在";
  const description = cat?.meta.desc ?? "引力分类内容";
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
  /* 取数编排在 category-detail 层：解析（与 metadata 同源）+ 内容流直查（026 复合索引） */
  const detail = await loadCategoryDetail(slug);
  if (!detail) notFound();
  const { name, meta, posts } = detail;

  return <div className="app-content">
    <SquareRefreshWatcher category={name} />
    <div className="min-w-0">
      <Link className="mb-4 inline-block text-[13px] text-muted transition-[color] duration-[180ms] hover:text-primary" href="/categories">← 返回全部分类</Link>

      <header className="mb-[18px] flex items-center gap-[14px] rounded-[14px] border border-line bg-surface p-[18px]">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-[22px] text-primary">{meta.icon}</span>
        <div className="min-w-0 flex-1">
          <h1 className="m-0 mb-1 text-[18px] font-semibold">{name}</h1>
          <p className="m-0 text-[13px] text-soft">{meta.desc}</p>
        </div>
        <span className="shrink-0 text-[13px] text-muted">{posts.length} 个内容</span>
      </header>

      {posts.length > 0 ? (
        <>
          <div className={homeGridClass}>{posts.map((post) => <SquareCard post={post} key={post.id} />)}</div>
        </>
      ) : (
        <p className="p-[48px_18px] text-center text-[13px] text-soft">该分类暂无内容，去「+ 发布」分享第一份好东西。</p>
      )}
    </div>

    {/* CollectionPage 结构化数据（分类枢纽页主题权威，2026-08-25 SEO） */}
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: jsonLd(buildCollectionPage({ name, description: meta.desc, url: `${SITE_URL}/categories/${slug}` })),
      }}
    />
  </div>;
}
