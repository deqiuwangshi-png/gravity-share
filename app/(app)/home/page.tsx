import type { Metadata } from "next";
import { AnnouncementCarousel } from "@/components/app/discovery/announcement-carousel";
import { HomeFeed } from "@/components/app/discovery/home-feed";
import { AppAside } from "@/components/app/shell/app-aside";
import { AppSection } from "@/components/app/shell/app-section";
import { createClient } from "@/lib/supabase/server";
import { fetchAnnouncements } from "@/lib/queries";

/* 右栏 AppAside 读库（探索领域/最新发现），首页需动态渲染 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "首页 | 引力",
  description: "发现来自互联网不同角落的好东西在等你探索",
};

/**
 * 首页（2026-08-23）：公告走马灯 → 内容流（三列卡片）→ 右栏
 * 内容流用 HomeFeed（读广场 square_posts，一行三列卡片布局）；
 * 与广场页 SquareFeed（单列列表）分离——首页三列卡片、广场单列列表，不复用布局
 */
export default async function HomePage() {
  const supabase = await createClient();
  /* 019 公告走马灯读库（RLS 只读上架；无公告不渲染） */
  const announcements = await fetchAnnouncements(supabase);

  return <div className="app-content app-layout">
    <div className="app-feed">
      {announcements.length > 0 && <AnnouncementCarousel items={announcements} />}

      <AppSection title="发现来自互联网不同角落的好东西" description="在等你探索">
        <HomeFeed />
      </AppSection>
    </div>

    <AppAside />
  </div>;
}
