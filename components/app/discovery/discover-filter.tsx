/**
 * 发现页筛选器：类型 chips + 卡片列表（client）
 * 数据来自发现内容池（lib/discovery-store）：初始为平台预置，发布后立即可见
 */
"use client";

import { useEffect, useState } from "react";
import { DiscoveryCard } from "./discovery-card";
import { DISCOVERY_UPDATED_EVENT, getDiscoveryItems } from "@/lib/discovery-store";

export function DiscoverFilter() {
  const [active, setActive] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const onUpdate = () => forceRender((t) => t + 1);
    window.addEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
  }, []);

  /* 内容池变化后重渲染，读取最新数据 */
  const items = getDiscoveryItems();
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
      <div className="discovery-grid">
        {filtered.map((item) => <DiscoveryCard item={item} key={item.id} />)}
      </div>
    </>
  );
}
