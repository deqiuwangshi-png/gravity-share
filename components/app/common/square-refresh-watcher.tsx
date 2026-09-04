"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SQUARE_UPDATED_EVENT, type SquareUpdateDetail } from "@/lib/events";

/**
 * 发布实时联动 watcher（2026-08-25 SEO：列表/分类页 SSR 化后保留原 client 增量刷新体验）
 * 监听 SQUARE_UPDATED_EVENT（发布/评论写库后 dispatch），触发服务端刷新重新渲染
 * 零渲染（返回 null），挂在 SSR 页面根部即可
 */
export function SquareRefreshWatcher({ category }: { category?: string }) {
  const router = useRouter();

  useEffect(() => {
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<SquareUpdateDetail>).detail;
      if (category && detail?.category && detail.category !== category) return;
      router.refresh();
    };
    window.addEventListener(SQUARE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SQUARE_UPDATED_EVENT, onUpdate);
  }, [category, router]);

  return null;
}
