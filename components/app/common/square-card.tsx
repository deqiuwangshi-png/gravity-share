/**
 * 广场帖子卡片（纯展示，2026-08-23 内容池归一后首页 / 分类详情 / 广场统一复用）
 * 四列内容流 (.home-grid) 承载；头像/昵称/时间 → 正文（3 行截断）→ 机会/来源标识 → 赞/评论统计；整卡可点 → /square/[id]
 */
import Link from "next/link";
import { MessageCircle, Heart } from "lucide-react";
import { AuthorLink } from "@/components/app/common/author-link";
import { AuthorBadge } from "@/components/app/common/author-badge";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { hasUrl } from "@/components/app/common/linkified-text";
import { hostOf } from "@/lib/links";
import type { SquarePostDTO } from "@/lib/types";

export function SquareCard({ post }: { post: SquarePostDTO }) {
  /* 正文预览（2026-09-02 A：统一消费服务端生成 preview——纯文本 160 字截断/富文本已剥标签，
   * 客户端不再逐卡 stripHtml；3 行截断由 CSS line-clamp 承担） */
  const preview = post.preview;
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

      <p className="home-card-body">{preview}</p>

      {post.postType === "opportunity" && (
        <p className="home-card-notice opportunity"><b>⚠ 机会</b>{post.commission ? ` · ${post.commission}` : ""}</p>
      )}
      {post.postType === "content" && post.sourcePlatform && (
        <p className="home-card-notice source">来源：{post.sourcePlatform}</p>
      )}

      <div className="home-card-stats">
        <span><Heart size={14} />{post.likes}</span>
        <span><MessageCircle size={14} />{post.comments}</span>
        {/* 含链接标记：preview（富文本已剥标签，URL 文字保留）里带 http 链接或独立 url 字段（旧帖） */}
        {(hasUrl(post.preview) || post.url) && (
          <span className="home-card-link-mark">{post.url ? hostOf(post.url) : "含链接"}</span>
        )}
      </div>
    </Link>
  );
}
