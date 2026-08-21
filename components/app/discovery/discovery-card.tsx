/**
 * 发现卡片（首页 / 发现页共用，3 列社交化卡片，client）
 * 结构：头像 + 用户名 + 时间（右侧收藏）→ 正文（note ?? description，2 行截断）
 * 无标题、无类型标签、无底部信息行——普通卡极简；推广卡正文下保留 ⚠ 警示行（合规例外）
 * 整卡可点 → /discover/[id] 详情
 */
"use client";

import Link from "next/link";
import type { DiscoveryItem } from "@/lib/types";
import { ICONS } from "@/lib/icons";

export function DiscoveryCard({
  item,
  reason,
}: {
  item: DiscoveryItem;
  reason?: string;
}) {
  const body = item.note ?? item.description ?? "";
  const avatar = item.author?.charAt(0) ?? "推";

  return (
    <Link className="discovery-card" href={`/discover/${item.id}`}>
      <div className="card-user">
        <span className="card-avatar">{avatar}</span>
        <span className="card-user-meta">
          <b>{item.author ?? "引力推荐"}</b>
          <small>{item.publishTime ?? ""}</small>
        </span>
        <button
          className="save-button"
          type="button"
          aria-label="收藏"
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
        >{ICONS.save}</button>
      </div>
      <p className="card-body">{body}</p>
      {item.commercial && (
        <p className="promo-note"><b>⚠ 推广</b> · {item.promoType ?? "推广"} · 风险自判</p>
      )}
      {reason && <p className="recommend-reason">因为{reason}</p>}
    </Link>
  );
}
