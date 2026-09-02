/**
 * 首页公告走马灯（client，019 起读库）——server 读 fetchAnnouncements 传 props，本组件只管轮播
 * - notice 文字卡：图标（有则显示）+ 标题 + 描述 + 「查看详情」（有 link 时）
 * - event / ad 海报卡：image_url 大图（整卡可点），无图时回落文字卡
 * - 链接：站内路径 next/link；外链 http(s) 走 /go 安全网关（safeHref）
 * - 轮播：自动 4s + Hover 暂停 + 圆点手动切换；单条不轮播
 * 样式：2026-09-03 自 styles/app/announcement.css 迁 Tailwind（动画 keyframes 收 decor⑩）
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { safeHref } from "@/lib/links";
import { publicImageUrl } from "@/lib/storage";
import type { Announcement } from "@/lib/types";

/** 自动轮播间隔（毫秒） */
const INTERVAL = 4000;

/** 文字卡图标标识 → 内联 SVG（数据层只存标识，图形由组件渲染；尺寸原子类化） */
const ICONS = {
  spark: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 L14.5 9.5 L21 12 L14.5 14.5 L12 21 L9.5 14.5 L3 12 L9.5 9.5 Z" />
    </svg>
  ),
  gem: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3 L18 3 L22 9 L12 21 L2 9 Z" />
      <path d="M2 9 L22 9" />
    </svg>
  ),
  ring: (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
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
    /* 2026-08-31：公告详情在官网区（marketing /notice/[slug]），走马灯（app 区）进入时打 from=app 标记，
     * 公告页据此把「返回」指向应用主页 /home（否则会回官网根路径，体验断裂） */
    const href = item.link.startsWith("/notice/")
      ? `${item.link}${item.link.includes("?") ? "&" : "?"}from=app`
      : item.link;
    return <Link className={className} href={href}>{children}</Link>;
  }
  const href = safeHref(item.link);
  /* 非 http/https（javascript:/data: 等）：不渲染可点击链接，纯展示 */
  if (!href) return <span className={className}>{children}</span>;
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

/** 卡片淡入（keyframes 见 decor⑩ announce-fade）；海报分支不带 flex——原 CSS 靠 .announce-poster
 * 后定义 display:block 覆盖 .announce-card 的 flex，原子类需两分支各自整串防同属性冲突 */
const CARD_TEXT = "flex animate-[announce-fade_300ms_ease] items-center gap-[14px]";
const CARD_POSTER = "relative block animate-[announce-fade_300ms_ease] overflow-hidden rounded-[10px] no-underline";

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
      className="mb-[42px] rounded-[12px] border border-line bg-background p-[18px_22px_14px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {isPoster ? (
        <AnnounceLink item={item} className={CARD_POSTER}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 运营海报（storage 或 https 外链） */}
          <img src={posterSrc!} alt={item.title} referrerPolicy="no-referrer" className="block max-h-[260px] w-full bg-hover object-cover" />
          <span className="absolute left-[10px] top-[10px] rounded-full bg-black/55 px-[10px] py-[3px] text-[11px] font-semibold text-white">{item.kind === "ad" ? "广告" : "活动"}</span>
        </AnnounceLink>
      ) : (
        <article className={CARD_TEXT} key={item.id}>
          {item.icon && <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-surface text-primary">{ICONS[item.icon]}</span>}
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px]">{item.title}</h3>
            {item.desc && <p className="mt-[3px] text-[12px] text-soft max-[800px]:hidden">{item.desc}</p>}
          </div>
          {item.link && (
            <AnnounceLink item={item} className="flex-none whitespace-nowrap text-[12px] font-semibold text-primary transition-colors duration-[180ms] hover:text-primary-dark">查看详情 →</AnnounceLink>
          )}
        </article>
      )}
      {items.length > 1 && (
        <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label="公告切换">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`h-[6px] w-[6px] cursor-pointer rounded-full border-0 p-0 transition-[background-color] duration-[180ms] ${i === safeIndex ? "bg-primary" : "bg-muted"}`}
              onClick={() => setIndex(i)}
              aria-label={`第 ${i + 1} 条公告`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
