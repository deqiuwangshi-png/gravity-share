import type { Metadata } from "next";
import { AnnouncementCarousel } from "@/components/app/discovery/announcement-carousel";
import { AppAside } from "@/components/app/shell/app-aside";
import { AppSection } from "@/components/app/shell/app-section";
import { DiscoveryCard } from "@/components/app/discovery/discovery-card";
import { recommendItems } from "@/lib/data";

export const metadata: Metadata = {
  title: "首页 | 引力",
  description: "公告、为你推荐与热门发现，从一个地方开始。",
};

export default function HomePage() {
  return <div className="app-content app-layout">
    <div className="app-feed">
      <AnnouncementCarousel />

      <AppSection title="为你推荐" description="根据你的兴趣，为你精选值得关注的东西" action="换一批 →">
        <div className="discovery-grid">{recommendItems.map((item) => <DiscoveryCard item={item} reason={item.reason} key={item.id} />)}</div>
      </AppSection>
    </div>

    <AppAside />
  </div>;
}
