import type { Metadata } from "next";
import { AnnouncementCarousel } from "@/components/app/discovery/announcement-carousel";
import { AppAside } from "@/components/app/shell/app-aside";
import { AppSection } from "@/components/app/shell/app-section";
import { DiscoveryCard } from "@/components/app/discovery/discovery-card";
import { createClient } from "@/lib/supabase/server";
import { fetchRecommended } from "@/lib/queries";

export const metadata: Metadata = {
  title: "首页 | 引力",
  description: "公告、为你推荐与热门发现，从一个地方开始。",
};

/** 2b：推荐位读库（reason 非空）；动态渲染不固化 build 时数据 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const items = await fetchRecommended(supabase);

  return <div className="app-content app-layout">
    <div className="app-feed">
      <AnnouncementCarousel />

      <AppSection title="为你推荐" description="根据你的兴趣，为你精选值得关注的东西" action="换一批 →">
        <div className="discovery-grid">{items.map((item) => <DiscoveryCard item={item} reason={item.reason} key={item.id} />)}</div>
      </AppSection>
    </div>

    <AppAside />
  </div>;
}
