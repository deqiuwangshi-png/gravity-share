import type { Metadata } from "next";
import { AppAside } from "@/components/app/shell/app-aside";
import { DiscoverFilter } from "@/components/app/discovery/discover-filter";

export const metadata: Metadata = {
  title: "发现 | 引力",
  description: "浏览来自互联网不同角落的好东西，按类型筛选。",
};

export default function DiscoverPage() {
  return <div className="app-content app-layout">
    <div className="app-feed">
      <header className="feed-head">
        <h1>发现</h1>
        <p>浏览来自互联网不同角落的好东西</p>
      </header>

      <DiscoverFilter />
    </div>

    <AppAside />
  </div>;
}
