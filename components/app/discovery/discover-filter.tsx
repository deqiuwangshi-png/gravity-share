/**
 * 发现页筛选器：类型 chips + 卡片列表（client）
 * 2b 起数据读库（RLS 公开读）：挂载拉取；发布后监听 DISCOVERY_UPDATED_EVENT 重新拉取
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { DiscoveryCard } from "./discovery-card";
import { createClient } from "@/lib/supabase/client";
import { DISCOVERY_UPDATED_EVENT, fetchDiscoveries } from "@/lib/queries";
import type { DiscoveryDTO } from "@/lib/types";

export function DiscoverFilter() {
  const [active, setActive] = useState<string | null>(null);
  const [items, setItems] = useState<DiscoveryDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    void fetchDiscoveries(createClient()).then((list) => {
      setItems(list);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
  }, [load]);

  const types = [...new Set(items.map((item) => item.type))];
  const filtered = active === null ? items : items.filter((item) => item.type === active);

  return (
    <>
      <div className="filter-chips" role="tablist" aria-label="按类型筛选">
        <button
          type="button"
          className={`filter-chip${active === null ? " active" : ""}`}
          onClick={() => setActive(null)}
        >全部</button>
        {types.map((type) => (
          <button
            type="button"
            key={type}
            className={`filter-chip${active === type ? " active" : ""}`}
            onClick={() => setActive(type)}
          >{type}</button>
        ))}
      </div>
      {loading ? (
        <p className="feed-loading">加载中…</p>
      ) : (
        <div className="discovery-grid">
          {filtered.map((item) => <DiscoveryCard item={item} key={item.id} />)}
        </div>
      )}
    </>
  );
}
