/**
 * 首页公告走马灯（client，019 起读库）——server 读 fetchAnnouncements 传 props，本组件只管轮播
 * - notice 文字卡：图标（有则显示）+ 标题 + 描述 + 「查看详情」（有 link 时）
 * - event / ad 海报卡：image_url 大图（整卡可点），无图时回落文字卡
 * - 链接：站内路径 next/link；外链 http(s) 走 /go 安全网关（safeHref）
 * - 轮播：自动 4s + Hover 暂停 + 圆点手动切换；单条不轮播
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { safeHref } from "@/lib/links";
import { publicImageUrl } from "@/lib/storage";
import type { Announcement } from "@/lib/types";

/** 自动轮播间隔（毫秒） */
const INTERVAL = 4000;

/** 文字卡图标标识 → 内联 SVG（数据层只存标识，图形由组件渲染） */
const ICONS = {
  spark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 L14.5 9.5 L21 12 L14.5 14.5 L12 21 L9.5 14.5 L3 12 L9.5 9.5 Z" />
    </svg>
  ),
  gem: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3 L18 3 L22 9 L12 21 L2 9 Z" />
      <path d="M2 9 L22 9" />
    </svg>
  ),
  ring: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
} as const;

/** 海报图 URL：https 外部图原样；http 拒绝（混合内容/被替换风险，2026-08-24 安全加固）；其余视为 storage announcements 桶 path */
function posterUrl(url: string): string | null {
  if (/^https:\/\//.test(url)) return url;
  if (/^http:\/\//.test(url)) return null;
  return publicImageUrl("announcements", url);
}

/** 链接壳：站内 next/link，外链 /go 安全网关；不安全或无 link 返回纯展示（不可点） */
function AnnounceLink({ item, children, className }: { item: Announcement; children: React.ReactNode; className?: string }) {
  if (!item.link) return <span className={className}>{children}</span>;
  /* 站内路径严格校验：拒绝 // 协议相对（跳外部）与 \ 容错路径（2026-08-24 安全加固） */
  const isInternal = item.link.startsWith("/") && !item.link.startsWith("//") && !item.link.includes("\\");
  if (isInternal) {
    return <Link className={className} href={item.link}>{children}</Link>;
  }
  const href = safeHref(item.link);
  /* 非 http/https（javascript:/data: 等）：不渲染可点击链接，纯展示 */
  if (!href) return <span className={className}>{children}</span>;
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export function AnnouncementCarousel({ items }: { items: Announcement[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /* 数据更新（增删公告）时索引越界保护 */
  const safeIndex = items.length === 0 ? 0 : index % items.length;

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [paused, items.length]);

  const item = items[safeIndex];
  if (!item) return null;

  /* http 外部图被 posterUrl 拒绝 → posterSrc 为 null → 回落文字卡 */
  const posterSrc = (item.kind === "event" || item.kind === "ad") && item.imageUrl ? posterUrl(item.imageUrl) : null;
  const isPoster = posterSrc !== null;

  return (
    <section
      className="announce-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {isPoster ? (
        <AnnounceLink item={item} className="announce-card announce-poster">
          {/* eslint-disable-next-line @next/next/no-img-element -- 运营海报（storage 或 https 外链） */}
          <img src={posterSrc!} alt={item.title} referrerPolicy="no-referrer" />
          <span className="announce-poster-tag">{item.kind === "ad" ? "广告" : "活动"}</span>
        </AnnounceLink>
      ) : (
        <article className="announce-card" key={item.id}>
          {item.icon && <span className="announce-icon">{ICONS[item.icon]}</span>}
          <div className="announce-text">
            <h3>{item.title}</h3>
            {item.desc && <p>{item.desc}</p>}
          </div>
          {item.link && (
            <AnnounceLink item={item} className="announce-link">查看详情 →</AnnounceLink>
          )}
        </article>
      )}
      {items.length > 1 && (
        <div className="announce-dots" role="tablist" aria-label="公告切换">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`announce-dot${i === safeIndex ? " active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`第 ${i + 1} 条公告`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
