import type { Metadata } from "next";
import { Suspense } from "react";
import { AnnouncementCarousel } from "@/components/app/discovery/announcement-carousel";
import { SquareFeed } from "@/components/app/square/square-feed";
import { LoadingState } from "@/components/ui/loading-state";
import { createClient } from "@/lib/supabase/server";
import { fetchAnnouncements } from "@/lib/queries/misc";
import { fetchSquarePosts } from "@/lib/queries/posts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "首页 | 引力",
  description: "发现来自互联网不同角落的好东西在等你探索",
};

/**
 * 引力首页工作台：公告 + 需求入口 + 探索区。
 * 当前探索区暂复用 SquareFeed 数据与组件，但 /home 的产品语义不是“广场”。
 * SquareFeed 承接探索区能力：024 全服通告横幅 + 内容分类导航 + ?q= 搜索 + 四列内容流（.home-grid）
 * 服务端预取 announcements + initialPosts 作为首帧（SSR 爬虫可见），client 接管交互与增量刷新
 */
export default async function HomePage() {
  const supabase = await createClient();
  /* P1-1 性能优化（2026-08-31）：公告 + 帖子两个查询并行发，不再排队串行等待 */
  const [announcements, initialPosts] = await Promise.all([
    fetchAnnouncements(supabase),
    fetchSquarePosts(supabase, 100),
  ]);

  return <div className="app-content">
    <div className="min-w-0">
      {announcements.length > 0 && <AnnouncementCarousel items={announcements} />}
      {/* useSearchParams 需 Suspense 边界（Next 约定，搜索 q 由 SquareFeed 读取） */}
      <Suspense fallback={<LoadingState />}>
        <SquareFeed initialPosts={initialPosts} />
      </Suspense>
    </div>
  </div>;
}
