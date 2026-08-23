/**
 * 分类详情页（/categories/[slug]，client，2026-08-23 内容池归一后读 square_posts）
 * 分类头（图标+名称+描述+动态计数）→ SquareCard 3 列内容流
 * 无效 slug → 404；该分类无内容 → 空态；发布实时联动（监听 SQUARE_UPDATED_EVENT）
 */
"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { LoadError } from "@/components/app/common/load-error";
import { SquareCard } from "@/components/app/common/square-card";
import { SQUARE_CATEGORIES, SQUARE_CATEGORY_META } from "@/lib/config";
import { useSquarePosts } from "@/lib/use-square-posts";

export default function CategoryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const catName = SQUARE_CATEGORIES.find((name) => SQUARE_CATEGORY_META[name].slug === slug);
  const meta = catName ? SQUARE_CATEGORY_META[catName] : null;
  const { posts, loading, failed, retry } = useSquarePosts();

  if (!catName || !meta) notFound();
  const list = posts.filter((post) => post.category === catName);

  return <div className="app-content">
    <div className="app-feed">
      <Link className="category-back" href="/categories">← 返回全部分类</Link>

      <header className="category-detail-head">
        <span className="category-detail-icon">{meta.icon}</span>
        <div className="category-detail-meta">
          <h1>{catName}</h1>
          <p>{meta.desc}</p>
        </div>
        <span className="category-detail-count">{list.length} 个内容</span>
      </header>

      {failed ? (
        <LoadError onRetry={retry} />
      ) : loading ? (
        <p className="feed-loading">加载中…</p>
      ) : list.length > 0 ? (
        <div className="home-grid">{list.map((post) => <SquareCard post={post} key={post.id} />)}</div>
      ) : (
        <p className="category-empty">该分类暂无内容，去「+ 发布」分享第一份好东西。</p>
      )}
    </div>
  </div>;
}
