/**
 * 分类详情页（/categories/[slug]，client）
 * 分类头（图标+名称+描述+动态计数）→ DiscoveryCard 3 列内容流（复用发现页）
 * 无效 slug → 404；该分类无内容 → 空态；发布实时联动（监听数据变更重新拉取）
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { AppAside } from "@/components/app/shell/app-aside";
import { DiscoveryCard } from "@/components/app/discovery/discovery-card";
import { LoadError } from "@/components/app/common/load-error";
import { categories } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { DISCOVERY_UPDATED_EVENT, fetchDiscoveries } from "@/lib/queries";
import type { DiscoveryDTO } from "@/lib/types";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const cat = categories.find((c) => c.slug === slug);
  const [items, setItems] = useState<DiscoveryDTO[]>([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    void fetchDiscoveries(createClient())
      .then(setItems)
      .catch(() => setFailed(true));
  }, []);

  /* 重试（事件处理器内重置状态，避免 effect 内同步 setState） */
  function retry() {
    setFailed(false);
    load();
  }

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
  }, [load]);

  if (!cat) notFound();
  const list = items.filter((item) => item.type === cat.name);

  return <div className="app-content app-layout">
    <div className="app-feed">
      <Link className="category-back" href="/categories">← 返回全部分类</Link>

      <header className="category-detail-head">
        <span className="category-detail-icon">{cat.icon}</span>
        <div className="category-detail-meta">
          <h1>{cat.name}</h1>
          <p>{cat.description}</p>
        </div>
        <span className="category-detail-count">{list.length} 个内容</span>
      </header>

      {failed ? (
        <LoadError onRetry={retry} />
      ) : list.length > 0 ? (
        <div className="discovery-grid">{list.map((item) => <DiscoveryCard item={item} key={item.id} />)}</div>
      ) : (
        <p className="category-empty">该分类暂无内容，去「+ 发布」分享第一份好东西。</p>
      )}
    </div>

    <AppAside />
  </div>;
}
