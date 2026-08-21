/**
 * 发现卡片（首页 / 发现页共用，3 列社交化卡片，client）
 * 结构：头像 + 用户名 + 时间（右侧收藏）→ 正文（note ?? description，2 行截断）
 * 无标题、无类型标签、无底部信息行——普通卡极简；推广卡正文下保留 ⚠ 警示行（合规例外）
 * 整卡可点 → /discover/[id] 详情；收藏 ♡ 2c 起落库 toggle（防卡内跳转）
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DiscoveryDTO } from "@/lib/types";
import { ICONS } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";
import { isFavorited, toggleFavorite } from "@/lib/queries";
import { AuthorLink } from "@/components/app/common/author-link";
import { AvatarBox } from "@/components/app/common/avatar-box";

export function DiscoveryCard({
  item,
  reason,
}: {
  item: DiscoveryDTO;
  reason?: string;
}) {
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState(false);
  const body = item.note ?? item.description ?? "";

  useEffect(() => {
    void isFavorited(createClient(), item.id)
      .then(setFavorited)
      .catch(() => { /* 状态查询失败默认未收藏，用户可点按钮重试 */ });
  }, [item.id]);

  async function onSave(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      setFavorited(await toggleFavorite(createClient(), item.id));
    } catch {
      /* 写失败保持原状态（P1-3 回滚，不再乐观更新） */
    }
    setBusy(false);
  }

  return (
    <Link className="discovery-card" href={`/discover/${item.id}`}>
      <div className="card-user">
        <AvatarBox path={item.authorAvatar} name={item.authorName ?? "推"} className="card-avatar" />
        <span className="card-user-meta">
          <b><AuthorLink authorId={item.authorId} name={item.authorName ?? "引力推荐"} /></b>
          <small>{item.time ?? ""}</small>
        </span>
        <button
          className={`save-button${favorited ? " active" : ""}`}
          type="button"
          aria-label={favorited ? "取消收藏" : "收藏"}
          aria-pressed={favorited}
          onClick={onSave}
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
