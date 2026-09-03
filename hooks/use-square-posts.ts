/**
 * useSquarePosts —— 广场帖子列表的加载 hook（2026-08-23 抽取，消除 4 处重复）
 * 统一「拉取 + loading/failed + 重试 + SQUARE_UPDATED_EVENT 监听」模式，
 * 供 SquareFeed / categories[slug] 等 client 列表复用。
 * 过滤逻辑（分类/搜索）由调用方基于返回的 posts 自己做（各页语义不同）。
 * 2026-08-25 SEO：支持 initialPosts 服务端预取作为首帧（SSR 爬虫可见），挂载后仍自动拉取最新。
 * 2026-09-03 归位：自 lib/use-square-posts.ts 迁至根级 hooks/（React hook 与 lib 纯工具/数据层分离）。
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SQUARE_UPDATED_EVENT } from "@/lib/events";
import { fetchSquarePostById, fetchSquarePosts } from "@/lib/queries/posts";
import type { SquarePostDTO } from "@/lib/types";

/** SQUARE_UPDATED_EVENT 的 detail（2026-09-02 D：发布/删除写库方携带，列表做增量刷新） */
type SquareUpdateDetail = { postId?: string; deletedId?: string };

export function useSquarePosts(initialPosts?: SquarePostDTO[]) {
  const [posts, setPosts] = useState<SquarePostDTO[]>(initialPosts ?? []);
  /* 有服务端预取首帧 → 不显示加载态；无预取（纯 client 调用方）保持原「加载中」行为 */
  const [loading, setLoading] = useState(!initialPosts);
  const [failed, setFailed] = useState(false);
  /* 窗口上限（D）：插头裁尾的裁尾边界 = SSR 首帧条数；首帧为空数组（暂无内容）或纯 client
   * 无首帧 → 对齐 fetchSquarePosts 默认 100（用 || 而非 ??：空数组 length 0 会裁光插头） */
  const capRef = useRef(initialPosts?.length || 100);

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
     * 纯 client 调用方（无首帧）保持挂载即拉。initialPosts 只影响挂载时是否立即拉取，纳入依赖重跑无副作用。 */
    if (!initialPosts) load();
    /* D（2026-09-02）：发布事件 detail.postId → 拉单条「去重插头 + 裁尾」替代全量重拉
     * （消除每发布 1 条 = 全量刷 100 的重复请求与列表跳变）；删除事件 deletedId → 原地移除；
     * 无 detail / 拉取失败 → 全量 load() 兜底（兼容旧派发方与其他未知变更） */
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<SquareUpdateDetail>).detail;
      if (detail?.postId) {
        void fetchSquarePostById(createClient(), detail.postId)
          .then((post) => {
            if (!post) {
              load(); /* 详情读不到（已删/RLS 变更）→ 兜底全量 */
              return;
            }
            setPosts((prev) => {
              const without = prev.filter((p) => p.id !== post.id); /* 去重：防事件重发重复插头 */
              return [post, ...without].slice(0, capRef.current);
            });
          })
          .catch(() => load());
        return;
      }
      if (detail?.deletedId) {
        setPosts((prev) => prev.filter((p) => p.id !== detail.deletedId));
        return;
      }
      load();
    };
    window.addEventListener(SQUARE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SQUARE_UPDATED_EVENT, onUpdate);
  }, [load, initialPosts]);

  return { posts, loading, failed, retry };
}
