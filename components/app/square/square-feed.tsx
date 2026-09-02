/**
 * 广场内容区（client）：单层内容分类导航（固定枚举，2026-08-23）+ 话题流
 * 分类是内容属性（square_posts.category），非兴趣标签；「全部」代表所有公开内容；
 * 导航一行横向排列，PC 单行可横向滚动
 * 2b 起数据读库（RLS 公开读）：挂载拉取；发布后监听 SQUARE_UPDATED_EVENT 重新拉取
 * 2026-08-25 SEO：接收服务端预取 initialPosts 作为首帧（SSR 爬虫可见），交互与增量刷新不变
 * 2026-08-27 方案A：列表区由单列 .square-list 改为四列 .home-grid（复用 SquareCard），
 * 与首页统一内容流布局；分类/搜索/置顶横幅(FeaturedBanner)逻辑不变
 * 2026-09-02 P2-home 批次：square.css cats 段 Tailwind 化（保留 square-cats 类名供 decor scrollbar 挂靠）
 */
"use client";

import { Fragment, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AD_FEED_INTERVAL, AD_SLOTS, SQUARE_CATEGORIES } from "@/lib/config";
import { AdSlot } from "@/components/common/ad-slot";
import { LoadError } from "@/components/app/common/load-error";
import { SquareCard, homeGridClass } from "@/components/app/common/square-card";
import { useSquarePosts } from "@/lib/use-square-posts";
import { FeaturedBanner } from "./featured-banner";
import type { SquarePostDTO } from "@/lib/types";

/** 状态段（feed-loading/feed-empty 原 feed.css，padding 48px 18px） */
const feedStateClass = "px-[18px] py-12 text-center text-[13px] text-soft";

export function SquareFeed({ initialPosts }: { initialPosts: SquarePostDTO[] }) {
  /* 分类筛选：默认「全部」（所有公开内容），点击后仅展示对应分类 */
  const [category, setCategory] = useState<string>("全部");
  /* 最小搜索（D1）：读 URL ?q= 前端过滤（content/tags/作者名），Next useSearchParams 框架能力 */
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const { posts, loading, failed, retry } = useSquarePosts(initialPosts);

  /* 024 展示位：置顶帖进「全服通告」横幅（全部置顶，不分分类），自然流排除置顶避免重复 */
  const featuredPosts = posts.filter((post) => post.featured);
  const normalPosts = posts.filter((post) => !post.featured);

  const filtered = (category === "全部" ? normalPosts : normalPosts.filter((post) => post.category === category)).filter(
    (post) =>
      !q ||
      /* 窗口搜索：preview（服务端摘要）+ 标题 + 标签 + 作者（2026-09-02 A：列表不再携带 content 全文，
       * 弱搜索以摘要/标题/标签覆盖，正文超 160 字尾部关键词不再命中——可接受降级） */
      post.preview.toLowerCase().includes(q) ||
      (post.title ?? "").toLowerCase().includes(q) ||
      post.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      post.authorName.toLowerCase().includes(q),
  );

  return (
    <>
      {/* 024 全服通告：分类导航之上（顶部通告）；搜索时隐藏（搜索结果聚焦） */}
      {!q && featuredPosts.length > 0 && <FeaturedBanner posts={featuredPosts} />}

      <div className="square-cats mb-[22px] flex items-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="按内容分类筛选">
        {(["全部", ...SQUARE_CATEGORIES] as const).map((name) => (
          <button
            type="button"
            key={name}
            role="tab"
            aria-selected={category === name}
            className={`shrink-0 cursor-pointer rounded-full border border-line bg-surface px-[14px] py-[6px] text-xs text-muted transition-[border-color,color,background-color] duration-[180ms] hover:border-line-primary hover:text-primary${category === name ? " border-primary bg-primary-soft font-semibold text-primary" : ""}`}
            onClick={() => setCategory(name)}
          >{name}</button>
        ))}
      </div>

      {failed ? (
        <LoadError onRetry={retry} />
      ) : loading ? (
        <p className={feedStateClass}>加载中…</p>
      ) : filtered.length === 0 ? (
        <p className={feedStateClass}>{q ? `未找到与「${q}」相关的内容。` : "该分类暂无内容，去「+ 发布」分享第一份好东西。"}</p>
      ) : (
        <div className={homeGridClass}>
          {/* A1 广告位：每 AD_FEED_INTERVAL 条内容后插入一张广告卡（内容不足则不插，避免「广告多于内容」） */}
          {filtered.map((post, index) => (
            <Fragment key={post.id}>
              <SquareCard post={post} />
              {(index + 1) % AD_FEED_INTERVAL === 0 && <AdSlot slot={AD_SLOTS.homeFeed} variant="feed" />}
            </Fragment>
          ))}
        </div>
      )}
    </>
  );
}
