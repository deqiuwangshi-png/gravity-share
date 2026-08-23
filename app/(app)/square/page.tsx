import type { Metadata } from "next";
import { Suspense } from "react";
import { AppAside } from "@/components/app/shell/app-aside";
import { SquareFeed } from "@/components/app/square/square-feed";

export const metadata: Metadata = {
  title: "广场 | 引力",
  description: "交流与分享 · 公开开放 · 也去看看圈外的世界。",
};

/* 右栏 AppAside 读库（探索领域/最新发现），广场页需动态渲染 */
export const dynamic = "force-dynamic";

export default function SquarePage() {
  return <div className="app-content app-layout">
    <div className="app-feed">
      <header className="feed-head">
        <h1>广场</h1>
        <p>交流与分享 · 公开开放 · 也去看看圈外的世界</p>
      </header>

      {/* useSearchParams 需 Suspense 边界（Next 约定，搜索 q 由 SquareFeed 读取） */}
      <Suspense fallback={<p className="feed-loading">加载中…</p>}>
        <SquareFeed />
      </Suspense>
    </div>

    <AppAside />
  </div>;
}
