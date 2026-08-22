import type { Metadata } from "next";
import { AnnouncementCarousel } from "@/components/app/discovery/announcement-carousel";
import { AppAside } from "@/components/app/shell/app-aside";
import { AppSection } from "@/components/app/shell/app-section";
import { DiscoverFilter } from "@/components/app/discovery/discover-filter";

export const metadata: Metadata = {
  title: "首页 | 引力",
  description: "发现来自互联网不同角落的好东西在等你探索",
};

/** 2b：内容流读库（RLS 公开读）；动态渲染不固化 build 时数据 */
export const dynamic = "force-dynamic";

/**
 * 首页（2026-08-22 内容流化）：公告走马灯 → 发现流（类型筛选 + 无限滚动懒加载）→ 右栏
 * 原「为你推荐」推荐位（reason 精选 6 条）下线，内容与发布入口（推荐好东西）直接对接
 */
export default async function HomePage() {
  return <div className="app-content app-layout">
    <div className="app-feed">
      <AnnouncementCarousel />

      <AppSection title="发现来自互联网不同角落的好东西" description="在等你探索">
        <DiscoverFilter />
      </AppSection>
    </div>

    <AppAside />
  </div>;
}
