import type { Metadata } from "next";
import { AppAside } from "@/components/app-aside";
import { recommendItems } from "@/lib/data";

export const metadata: Metadata = {
  title: "推荐 | 引力",
  description: "根据你的浏览与收藏，为你精选值得关注的东西。",
};

export default function RecommendPage() {
  return <div className="app-content app-layout">
    <div className="app-feed">
      <header className="feed-head">
        <h1>为你推荐</h1>
        <p>根据你的浏览与收藏，为你精选值得关注的东西</p>
      </header>

      <div className="recommend-grid">{recommendItems.map((item) => <article className="discovery-card" key={item.title}>
        <div className="card-top"><span className={`app-tag${item.commercial ? " commercial" : ""}`}>{item.type}</span><button className="save-button" type="button" aria-label={`收藏${item.title}`}>♡</button></div>
        <h3>{item.title}</h3><p className="card-description">{item.description}</p>
        <div className="card-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <div className="card-bottom"><span className="card-source"><i />{item.source}</span><a href="#">查看 →</a></div>
        <p className="recommend-reason">因为{item.reason}</p>
      </article>)}</div>
    </div>

    <AppAside />
  </div>;
}
