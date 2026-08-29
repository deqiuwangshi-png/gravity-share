/**
 * useSquarePosts —— 广场帖子列表的加载 hook（2026-08-23 抽取，消除 4 处重复）
 * 统一「拉取 + loading/failed + 重试 + SQUARE_UPDATED_EVENT 监听」模式，
 * 供 SquareFeed / categories[slug] 等 client 列表复用。
 * 过滤逻辑（分类/搜索）由调用方基于返回的 posts 自己做（各页语义不同）。
 * 2026-08-25 SEO：支持 initialPosts 服务端预取作为首帧（SSR 爬虫可见），挂载后仍自动拉取最新。
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SQUARE_UPDATED_EVENT } from "@/lib/events";
import { fetchSquarePosts } from "@/lib/queries-posts";
import type { SquarePostDTO } from "@/lib/types";

export function useSquarePosts(initialPosts?: SquarePostDTO[]) {
  const [posts, setPosts] = useState<SquarePostDTO[]>(initialPosts ?? []);
  /* 有服务端预取首帧 → 不显示加载态；无预取（纯 client 调用方）保持原「加载中」行为 */
  const [loading, setLoading] = useState(!initialPosts);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    void fetchSquarePosts(createClient())
      .then((list) => {
        setPosts(list);
        setLoading(false);
      })
      .catch(() => {
        setFailed(true);
        setLoading(false);
      });
  }, []);

  /* 重试（事件处理器内重置状态，避免 effect 内同步 setState） */
  function retry() {
    setLoading(true);
    setFailed(false);
    load();
  }

  useEffect(() => {
    /* L1（2026-08-28）：有 SSR 首帧（initialPosts）时挂载不重拉，消除「服务端预取 + 挂载再拉」双重查询；
     * 仅发布事件（SQUARE_UPDATED_EVENT）触发全量刷新；纯 client 调用方（无首帧）保持挂载即拉。
     * initialPosts 只影响挂载时是否立即拉取，纳入依赖重跑无副作用（有首帧时永不执行 load）。 */
    if (!initialPosts) load();
    const onUpdate = () => load();
    window.addEventListener(SQUARE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SQUARE_UPDATED_EVENT, onUpdate);
  }, [load, initialPosts]);

  return { posts, loading, failed, retry };
}
