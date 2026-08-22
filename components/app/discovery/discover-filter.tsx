/**
 * 发现流（首页内容区，client）——类型 chips + 无限滚动懒加载
 * - 服务端分批拉取（每批 PAGE_SIZE 条，supabase range 分页），无传统分页器
 * - 列表底部哨兵元素 + IntersectionObserver：接近底部自动请求下一批
 * - 切换类型 / 发布新内容（DISCOVERY_UPDATED_EVENT）→ 重置并拉第一批
 * - 追加失败静默停止（不打断已展示内容），首屏失败显示重试
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DiscoveryCard } from "./discovery-card";
import { LoadError } from "@/components/app/common/load-error";
import { createClient } from "@/lib/supabase/client";
import { DISCOVERY_UPDATED_EVENT, fetchDiscoveries, fetchDiscoveryTypes } from "@/lib/queries";
import type { DiscoveryDTO } from "@/lib/types";

/** 无限滚动每批条数（2026-08-22 定稿：12 条/批） */
const PAGE_SIZE = 12;

export function DiscoverFilter() {
  const [active, setActive] = useState<string | null>(null);
  const [items, setItems] = useState<DiscoveryDTO[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  /* ref 镜像（仅在 loadPage 异步上下文读写，规避闭包陈旧与 render 期写 ref） */
  const activeRef = useRef<string | null>(null);
  const itemsRef = useRef<DiscoveryDTO[]>([]);
  const lockRef = useRef(false);

  const loadPage = useCallback(async (reset: boolean) => {
    if (lockRef.current) return;
    lockRef.current = true;
    const supabase = createClient();
    const type = activeRef.current;
    const start = reset ? 0 : itemsRef.current.length;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const [batch, typeList] = await Promise.all([
        fetchDiscoveries(supabase, type
          ? { type, from: start, to: start + PAGE_SIZE - 1 }
          : { from: start, to: start + PAGE_SIZE - 1 }),
        reset ? fetchDiscoveryTypes(supabase) : Promise.resolve([] as string[]),
      ]);
      const next = reset ? batch : [...itemsRef.current, ...batch];
      itemsRef.current = next;
      setItems(next);
      /* 拉满一整批 → 可能还有更多；不足一批 → 到底了 */
      setHasMore(batch.length === PAGE_SIZE);
      if (reset) setTypes(typeList);
    } catch {
      if (reset) {
        setFailed(true);
      } else {
        /* 追加失败：静默停止自动加载，已展示内容不受影响 */
        setHasMore(false);
      }
    } finally {
      lockRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  /* 首屏 + 发布事件后重置拉取（setTimeout 微任务：规避 effect 内同步 setState 的 lint 约束） */
  useEffect(() => {
    const timer = window.setTimeout(() => void loadPage(true), 0);
    const onUpdate = () => void loadPage(true);
    window.addEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
    };
  }, [loadPage]);

  /* 无限滚动：哨兵元素进入视口（提前 240px）→ 拉下一批 */
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadPage(false);
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadPage]);

  /* 重试（事件处理器内重置状态，避免 effect 内同步 setState） */
  function retry() {
    setFailed(false);
    void loadPage(true);
  }

  /** 切换类型：同步 ref + state，重置分页 */
  function onTypeChange(name: string | null) {
    if (name === activeRef.current) return;
    activeRef.current = name;
    setActive(name);
    void loadPage(true);
  }

  return (
    <>
      <div className="filter-chips" role="tablist" aria-label="按类型筛选">
        <button
          type="button"
          className={`filter-chip${active === null ? " active" : ""}`}
          onClick={() => onTypeChange(null)}
        >全部</button>
        {types.map((type) => (
          <button
            type="button"
            key={type}
            className={`filter-chip${active === type ? " active" : ""}`}
            onClick={() => onTypeChange(type)}
          >{type}</button>
        ))}
      </div>

      {failed ? (
        <LoadError onRetry={retry} />
      ) : loading ? (
        <div className="discovery-grid" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => <div className="discover-skeleton" key={index} />)}
        </div>
      ) : items.length === 0 ? (
        <p className="feed-empty">该分类暂无内容，去「+ 发布」分享第一份好东西。</p>
      ) : (
        <div className="discovery-grid">
          {items.map((item) => <DiscoveryCard item={item} key={item.id} />)}
        </div>
      )}

      {/* 底部哨兵 + 加载状态（无分页器） */}
      {!failed && !loading && items.length > 0 && (
        <div className="feed-sentinel" ref={sentinelRef}>
          {loadingMore ? <span className="feed-sentinel-text">加载中…</span> : !hasMore ? <span className="feed-sentinel-text">已经到底啦</span> : null}
        </div>
      )}
    </>
  );
}
