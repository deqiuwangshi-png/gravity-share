/**
 * 全服通告横幅（client，2026-08-27 展示位落地广场页）
 * 置顶帖（featured_until > now()）在广场页顶部的横幅区轮播展示，点击进详情
 * 与自然流分离：列表已排除置顶帖（SquareFeed 拆分），此处不重复
 * 轮播：多条 4s 自动切换 + hover 暂停 + 圆点手动；单条静态不轮播
 * 正文（2026-09-02）：消费服务端生成 post.preview（富文本已剥标签，横幅单行截断）
 * 2026-09-02 P2-home 批次：square.css banner 段 Tailwind 化（AvatarBox 透传尺寸类）
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
      className="mb-[14px] rounded-[14px] border border-accent bg-accent-soft p-[14px_16px]"
      aria-label="全服通告"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-[10px] flex items-center gap-2">
        <span className="rounded-full bg-accent px-[10px] py-[2px] text-[11px] font-semibold text-on-accent">全服通告</span>
        <span className="text-[11px] text-soft">付费展示位 · 置顶中</span>
        {posts.length > 1 && (
          <div className="ml-auto flex gap-1" role="tablist" aria-label="通告切换">
            {posts.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`size-[6px] cursor-pointer rounded-full border-0 p-0 transition-colors duration-[180ms] ${i === safeIndex ? "bg-accent" : "bg-line-primary"}`}
                onClick={() => setIndex(i)}
                aria-label={`第 ${i + 1} 条通告`}
              />
            ))}
          </div>
        )}
      </div>
      <Link className="flex items-center gap-3" href={`/square/${post.id}`}>
        <AvatarBox path={post.authorAvatar} name={post.authorName} className="size-[34px] shrink-0" badge={post.authorBadge} />
        <div className="min-w-0 flex-1">
          <p className="m-0 mb-[2px] truncate text-[13px] font-medium">{post.preview}</p>
          <small className="text-[11px] text-soft">{post.authorName} · {post.time}</small>
        </div>
        <span className="shrink-0 text-xs text-accent">查看 →</span>
      </Link>
    </section>
  );
}
