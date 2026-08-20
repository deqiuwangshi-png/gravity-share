import type { Metadata } from "next";
import { AnnouncementCarousel } from "@/components/announcement-carousel";
import { AppAside } from "@/components/app-aside";
import { AppSection } from "@/components/app-section";
import { discoveryItems } from "@/lib/data";

export const metadata: Metadata = {
  title: "发现 | 引力",
  description: "从互联网不同角落，发现真正值得关注的东西。",
};

export default function HomePage() {
  return <div className="app-content app-layout">
    <div className="app-feed">
      <AnnouncementCarousel />

      <AppSection title="为你发现" description="根据你的兴趣，发现一些值得关注的东西" action="换一批 →">
        <div className="discovery-grid">{discoveryItems.map((item) => <article className="discovery-card" key={item.title}>
          <div className="card-top"><span className={`app-tag${item.commercial ? " commercial" : ""}`}>{item.type}</span><button className="save-button" type="button" aria-label={`收藏${item.title}`}>♡</button></div>
          <h3>{item.title}</h3><p className="card-description">{item.description}</p>
          <div className="card-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className="card-bottom"><span className="card-source"><i />{item.source}</span><a href="#">查看 →</a></div>
        </article>)}</div>
      </AppSection>
    </div>

    <AppAside />
  </div>;
}
