import type { Metadata } from "next";
import { Suspense } from "react";
import { AppAside } from "@/components/app/shell/app-aside";
import { SquareFeed } from "@/components/app/square/square-feed";
import { createClient } from "@/lib/supabase/server";
import { fetchSquarePosts } from "@/lib/queries";

export const metadata: Metadata = {
  title: "广场",
  description: "交流与分享 · 公开开放 · 也去看看圈外的世界。",
  alternates: { canonical: "/square" },
};

/* 右栏 AppAside 读库（探索领域/最新发现），广场页需动态渲染 */
export const dynamic = "force-dynamic";

export default async function SquarePage() {
  /* 2026-08-25 SEO（M3）：服务端预取列表首帧（爬虫可见 UGC），client 组件接管交互与增量刷新 */
  const supabase = await createClient();
  const initialPosts = await fetchSquarePosts(supabase, 100);

  return <div className="app-content app-layout">
    <div className="app-feed">
      <header className="feed-head">
        <h1>广场</h1>
        <p>交流与分享 · 公开开放 · 也去看看圈外的世界</p>
      </header>

      {/* useSearchParams 需 Suspense 边界（Next 约定，搜索 q 由 SquareFeed 读取） */}
      <Suspense fallback={<p className="feed-loading">加载中…</p>}>
        <SquareFeed initialPosts={initialPosts} />
      </Suspense>
    </div>

    <AppAside />
  </div>;
}
