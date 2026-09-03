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
 * 首页（2026-08-27 方案A：广场合并进首页，纯前端零迁移）
 * 顶部：公告走马灯（含 kind=ad 广告海报卡，复用 AnnouncementCarousel）→ 标题 → SquareFeed
 * SquareFeed 承接原广场能力：024 全服通告横幅 + 内容分类导航 + ?q= 搜索 + 四列内容流（.home-grid）
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

      <header className="mb-4 flex flex-wrap items-baseline gap-x-3">
        <h1 className="m-0 text-2xl tracking-[-0.5px]">发现</h1>
        <p className="m-0 text-[13px] text-muted">来自互联网不同角落的好东西，在等你探索</p>
      </header>

      {/* useSearchParams 需 Suspense 边界（Next 约定，搜索 q 由 SquareFeed 读取） */}
      <Suspense fallback={<LoadingState />}>
        <SquareFeed initialPosts={initialPosts} />
      </Suspense>
    </div>
  </div>;
}
