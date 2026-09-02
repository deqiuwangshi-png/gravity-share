/**
 * 全服通告横幅（client，2026-08-27 展示位落地广场页）
 * 置顶帖（featured_until > now()）在广场页顶部的横幅区轮播展示，点击进详情
 * 与自然流分离：列表已排除置顶帖（SquareFeed 拆分），此处不重复
 * 轮播：多条 4s 自动切换 + hover 暂停 + 圆点手动；单条静态不轮播
 * 正文（2026-09-02）：消费服务端生成 post.preview（富文本已剥标签，横幅单行截断）
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { AvatarBox } from "@/components/app/common/avatar-box";
import type { SquarePostDTO } from "@/lib/types";

/** 轮播间隔（毫秒） */
const INTERVAL = 4000;

export function FeaturedBanner({ posts }: { posts: SquarePostDTO[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /* 数据更新（发布/刷新后重拉）时索引越界保护 */
  const safeIndex = posts.length === 0 ? 0 : index % posts.length;

  useEffect(() => {
    if (paused || posts.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % posts.length), INTERVAL);
    return () => clearInterval(timer);
  }, [paused, posts.length]);

  const post = posts[safeIndex];
  if (!post) return null;

  return (
    <section
      className="square-banner"
      aria-label="全服通告"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="square-banner-head">
        <span className="square-banner-tag">全服通告</span>
        <span className="square-banner-sub">付费展示位 · 置顶中</span>
        {posts.length > 1 && (
          <div className="square-banner-dots" role="tablist" aria-label="通告切换">
            {posts.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`square-banner-dot${i === safeIndex ? " active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`第 ${i + 1} 条通告`}
              />
            ))}
          </div>
        )}
      </div>
      <Link className="square-banner-card" href={`/square/${post.id}`}>
        <AvatarBox path={post.authorAvatar} name={post.authorName} className="square-banner-avatar" badge={post.authorBadge} />
        <div className="square-banner-text">
          <p className="square-banner-content">{post.preview}</p>
          <small>{post.authorName} · {post.time}</small>
        </div>
        <span className="square-banner-arrow">查看 →</span>
      </Link>
    </section>
  );
}
