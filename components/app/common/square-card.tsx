/**
 * 广场帖子三列卡片（纯展示，2026-08-23 内容池归一后 HomeFeed / 分类详情共用）
 * 头像/昵称/时间 → 正文（3 行截断）→ 机会/来源标识 → 赞/评论/浏览统计；整卡可点 → /square/[id]
 */
import Link from "next/link";
import { MessageCircle, Heart, Eye } from "lucide-react";
import { AuthorLink } from "@/components/app/common/author-link";
import { AuthorBadge } from "@/components/app/common/author-badge";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { hasUrl } from "@/components/app/common/linkified-text";
import { hostOf } from "@/lib/links";
import type { SquarePostDTO } from "@/lib/types";

export function SquareCard({ post }: { post: SquarePostDTO }) {
  return (
    <Link className="home-card" href={`/square/${post.id}`}>
      <div className="home-card-head">
        <AvatarBox path={post.authorAvatar} name={post.authorName} className="home-avatar" badge={post.authorBadge} />
        <span className="home-card-meta">
          <b><AuthorLink authorId={post.authorId} name={post.authorName} /><AuthorBadge badge={post.authorBadge} /></b>
          <small>{post.time}</small>
        </span>
        {/* 024 展示位（大喇叭置顶）：置顶中卡片右上角金色「展示」标 */}
        {post.featured && <span className="home-card-featured">展示</span>}
      </div>

      <p className="home-card-body">{post.content}</p>

      {post.postType === "opportunity" && (
        <p className="home-card-notice opportunity"><b>⚠ 机会</b>{post.commission ? ` · ${post.commission}` : ""}</p>
      )}
      {post.postType === "content" && post.sourcePlatform && (
        <p className="home-card-notice source">来源：{post.sourcePlatform}</p>
      )}

      <div className="home-card-stats">
        <span><Heart size={14} />{post.likes}</span>
        <span><MessageCircle size={14} />{post.comments}</span>
        <span><Eye size={14} />{post.views}</span>
        {(hasUrl(post.content) || post.url) && (
          <span className="home-card-link-mark">{post.url ? hostOf(post.url) : "含链接"}</span>
        )}
      </div>
    </Link>
  );
}
