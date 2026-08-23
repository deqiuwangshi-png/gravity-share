/**
 * useSquarePosts —— 广场帖子列表的加载 hook（2026-08-23 抽取，消除 4 处重复）
 * 统一「拉取 + loading/failed + 重试 + SQUARE_UPDATED_EVENT 监听」模式，
 * 供 HomeFeed / SquareFeed / categories[slug] 等 client 列表复用。
 * 过滤逻辑（分类/搜索）由调用方基于返回的 posts 自己做（各页语义不同）。
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchSquarePosts, SQUARE_UPDATED_EVENT } from "@/lib/queries";
import type { SquarePostDTO } from "@/lib/types";

export function useSquarePosts() {
  const [posts, setPosts] = useState<SquarePostDTO[]>([]);
  const [loading, setLoading] = useState(true);
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
    load();
    const onUpdate = () => load();
    window.addEventListener(SQUARE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SQUARE_UPDATED_EVENT, onUpdate);
  }, [load]);

  return { posts, loading, failed, retry };
}
