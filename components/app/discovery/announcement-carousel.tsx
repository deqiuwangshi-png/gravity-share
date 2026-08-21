"use client";

import { useEffect, useState } from "react";
import { ANNOUNCEMENTS } from "@/lib/data";

/** 自动轮播间隔（毫秒） */
const INTERVAL = 4000;

/** 图标标识 → 内联 SVG（极简几何线条，数据层只存标识，图形由组件渲染） */
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

/** 无图公告走马灯：自动轮播 + Hover 暂停 + 圆点手动切换 */
export function AnnouncementCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % ANNOUNCEMENTS.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [paused]);

  const item = ANNOUNCEMENTS[index];

  return (
    <section
      className="announce-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <article className="announce-card" key={index}>
        <span className="announce-icon">{ICONS[item.icon]}</span>
        <div className="announce-text">
          <h3>{item.title}</h3>
          <p>{item.desc}</p>
        </div>
        <span className="announce-link" data-placeholder>查看详情 →</span>
      </article>
      <div className="announce-dots" role="tablist" aria-label="公告切换">
        {ANNOUNCEMENTS.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`announce-dot${i === index ? " active" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={`第 ${i + 1} 条公告`}
          />
        ))}
      </div>
    </section>
  );
}
