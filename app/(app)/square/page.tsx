import type { Metadata } from "next";
import { AppAside } from "@/components/app/shell/app-aside";
import { SquareFeed } from "@/components/app/square/square-feed";

export const metadata: Metadata = {
  title: "广场 | 引力",
  description: "交流与分享 · 公开开放 · 也去看看圈外的世界。",
};

export default function SquarePage() {
  return <div className="app-content app-layout">
    <div className="app-feed">
      <header className="feed-head">
        <h1>广场</h1>
        <p>交流与分享 · 公开开放 · 也去看看圈外的世界</p>
      </header>

      <SquareFeed />
    </div>

    <AppAside />
  </div>;
}
