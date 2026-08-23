/**
 * 广场内容区（client）：单层内容分类导航（固定枚举，2026-08-23）+ 话题流
 * 分类是内容属性（square_posts.category），非兴趣标签；「全部」代表所有公开内容；
 * 导航一行横向排列，PC 单行可横向滚动
 * 2b 起数据读库（RLS 公开读）：挂载拉取；发布后监听 SQUARE_UPDATED_EVENT 重新拉取
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SQUARE_CATEGORIES } from "@/lib/config";
import { LoadError } from "@/components/app/common/load-error";
import { useSquarePosts } from "@/lib/use-square-posts";
import { hasUrl } from "@/components/app/common/linkified-text";
import { AuthorLink } from "@/components/app/common/author-link";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { MessageCircle, Heart, Eye } from "lucide-react";

export function SquareFeed() {
  /* 分类筛选：默认「全部」（所有公开内容），点击后仅展示对应分类 */
  const [category, setCategory] = useState<string>("全部");
  /* 最小搜索（D1）：读 URL ?q= 前端过滤（content/tags/作者名），Next useSearchParams 框架能力 */
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const { posts, loading, failed, retry } = useSquarePosts();

  const filtered = (category === "全部" ? posts : posts.filter((post) => post.category === category)).filter(
    (post) =>
      !q ||
      post.content.toLowerCase().includes(q) ||
      post.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      post.authorName.toLowerCase().includes(q),
  );

  return (
    <>
      <div className="square-cats" role="tablist" aria-label="按内容分类筛选">
        {(["全部", ...SQUARE_CATEGORIES] as const).map((name) => (
          <button
            type="button"
            key={name}
            role="tab"
            aria-selected={category === name}
            className={`square-cat${category === name ? " active" : ""}`}
            onClick={() => setCategory(name)}
          >{name}</button>
        ))}
      </div>

      {failed ? (
        <LoadError onRetry={retry} />
      ) : loading ? (
        <p className="feed-loading">加载中…</p>
      ) : filtered.length === 0 ? (
        <p className="feed-empty">{q ? `未找到与「${q}」相关的内容。` : "该分类暂无内容，去「+ 发布」分享第一份好东西。"}</p>
      ) : (
        <div className="square-list">
          {filtered.map((post) => (
            <Link className="square-card" href={`/square/${post.id}`} key={post.id}>
              <div className="square-card-head">
                <AvatarBox path={post.authorAvatar} name={post.authorName} className="square-avatar" />
                <strong><AuthorLink authorId={post.authorId} name={post.authorName} /></strong>
                <small>{post.time}</small>
              </div>
              <p className="square-card-content">{post.content}</p>
              {post.postType === "opportunity" && (
                <p className="square-card-notice opportunity"><b>⚠ 机会</b>{post.commission ? ` · ${post.commission}` : ""}</p>
              )}
              {post.postType === "content" && post.sourcePlatform && (
                <p className="square-card-notice source">来源：{post.sourcePlatform}</p>
              )}
              <div className="square-card-meta">
                <span><Heart size={15} />{post.likes} 赞</span>
                <span><MessageCircle size={15} />{post.comments} 评论</span>
                <span><Eye size={15} />{post.views} 浏览</span>
                {(hasUrl(post.content) || post.url) && <span className="square-card-link-mark">含链接</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
