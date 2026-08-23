/**
 * 首页内容流（client，2026-08-23）：读广场 square_posts，一行三列卡片布局
 * 与广场页 SquareFeed（单列列表）分离——首页用三列卡片，广场用单列列表，两者不复用布局
 * 数据：useSquarePosts（统一加载/重试/事件监听）；失败兜底重试
 */
"use client";

import { LoadError } from "@/components/app/common/load-error";
import { SquareCard } from "@/components/app/common/square-card";
import { useSquarePosts } from "@/lib/use-square-posts";

export function HomeFeed() {
  const { posts, loading, failed, retry } = useSquarePosts();

  if (failed) return <LoadError onRetry={retry} />;
  if (loading) return <p className="feed-loading">加载中…</p>;

  return (
    <div className="home-grid">
      {posts.map((post) => <SquareCard post={post} key={post.id} />)}
    </div>
  );
}
