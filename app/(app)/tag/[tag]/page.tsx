/**
 * 标签页（/tag/[tag]，2026-08-31 P0-7）——SEO 标签体系：
 * 标签是自由文本（发布时 # 提取），页面为 server 组件（爬虫可见内容列表）。
 * 防低质页策略（需求十三）：
 *   ≥3 条内容 → index（进收录）
 *   <3 条内容 → noindex, follow（不污染索引，链接仍可跟）
 *   0 条内容 → 404（不产生空标签页）
 * canonical 用 encodeURIComponent(tag) 与站内链接保持同源（中文标签 URL 编码形态）。
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchSquarePostsByTag } from "@/lib/queries-posts";
import { SITE_URL, buildCollectionPage, jsonLd } from "@/lib/seo";
import { SquareCard, homeGridClass } from "@/components/app/common/square-card";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ tag: string }> };

/** 同一次请求内 generateMetadata 与页面主体共享同一查询（React cache 以 tag 为 key） */
const getPosts = cache(async (tag: string) => {
  const supabase = await createClient();
  return fetchSquarePostsByTag(supabase, tag);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const posts = await getPosts(tag);
  if (posts.length === 0) return { title: "标签不存在" };
  return {
    title: `#${tag} 标签`,
    description: `与「${tag}」相关的公开分享，共 ${posts.length} 条。`,
    alternates: { canonical: `/tag/${encodeURIComponent(tag)}` },
    /* 内容量阈值：<3 条 noindex（防自由标签制造低质页），>=3 条 index */
    robots: { index: posts.length >= 3, follow: true },
  };
}

export default async function TagPage({ params }: PageProps) {
  const { tag } = await params;
  const posts = await getPosts(tag);
  if (posts.length === 0) notFound();

  return (
    <div className="app-content">
      <div className="min-w-0">
        <Link className="mb-4 inline-block text-[13px] text-muted transition-[color] duration-[180ms] hover:text-primary" href="/home">← 返回首页</Link>

        <header className="mb-[18px] flex items-center gap-[14px] rounded-[14px] border border-line bg-surface p-[18px]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-[22px] text-primary">#</span>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 mb-1 text-[18px] font-semibold">#{tag}</h1>
            <p className="m-0 text-[13px] text-soft">与「{tag}」相关的公开分享</p>
          </div>
          <span className="shrink-0 text-[13px] text-muted">{posts.length} 个内容</span>
        </header>

        {posts.length > 0 ? (
          <div className={homeGridClass}>{posts.map((post) => <SquareCard post={post} key={post.id} />)}</div>
        ) : (
          <p className="p-[48px_18px] text-center text-[13px] text-soft">该标签暂无内容，去「+ 发布」分享第一份好东西。</p>
        )}
      </div>

      {/* CollectionPage 结构化数据（与分类页一致的主题页语义） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            buildCollectionPage({
              name: `#${tag}`,
              description: `与「${tag}」相关的内容合集`,
              url: `${SITE_URL}/tag/${encodeURIComponent(tag)}`,
            }),
          ),
        }}
      />
    </div>
  );
}
