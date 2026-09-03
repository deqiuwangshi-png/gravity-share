/**
 * 广场帖子卡片（纯展示，2026-08-23 内容池归一后首页 / 分类详情 / 广场统一复用）
 * 四列内容流 (.home-grid) 承载；头像/昵称/时间 → 正文（3 行截断）→ 机会/来源标识 → 赞/评论统计；整卡可点 → /square/[id]
 * 2026-09-02 P2-home 批次：home.css 全量 Tailwind 化（保留 home-card 类名供 decor.css hover 阴影挂靠）
 */
import Link from "next/link";
import { MessageCircle, Heart } from "lucide-react";
import { AuthorLink } from "@/components/app/common/author-link";
import { AuthorBadge } from "@/components/app/common/author-badge";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { hasUrl } from "@/components/app/common/linkified-text";
import { hostOf } from "@/lib/links";
import type { SquarePostDTO } from "@/lib/types";

/** 四列内容流网格（原 home.css .home-grid；断点降级 960→3 列 / 640→2 列 / 420→1 列逐像素保留） */
export const homeGridClass =
  "grid grid-cols-4 gap-[14px] max-[960px]:grid-cols-3 max-[640px]:grid-cols-2 max-[420px]:grid-cols-1";

export function SquareCard({ post }: { post: SquarePostDTO }) {
  /* 正文预览（2026-09-02 A：统一消费服务端生成 preview——纯文本 160 字截断/富文本已剥标签，
   * 客户端不再逐卡 stripHtml；3 行截断由 CSS line-clamp 承担） */
  const preview = post.preview;
  return (
    <Link className="home-card flex flex-col rounded-[12px] border border-line bg-surface p-[14px] transition-[border-color,transform,box-shadow] duration-[180ms] hover:-translate-y-0.5 hover:border-line-primary" href={`/square/${post.id}`}>
      <div className="mb-[10px] flex items-center gap-2">
        <AvatarBox path={post.authorAvatar} name={post.authorName} className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary" badge={post.authorBadge} />
        <span className="grid min-w-0 flex-1 gap-[1px]">
          <b className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold"><AuthorLink authorId={post.authorId} name={post.authorName} /><AuthorBadge badge={post.authorBadge} /></b>
          <small className="text-[10px] text-soft">{post.time}</small>
        </span>
      </div>

      <p className="line-clamp-3 m-0 whitespace-pre-line break-words text-[13px] leading-[1.65] text-foreground">{preview}</p>

      {post.postType === "opportunity" && (
        <p className="mt-2 border-t border-dashed border-line pt-2 text-[11px] leading-[1.6] text-muted"><b className="font-semibold text-error">⚠ 机会</b>{post.commission ? ` · ${post.commission}` : ""}</p>
      )}
      {post.postType === "content" && post.sourcePlatform && (
        <p className="mt-2 border-t border-dashed border-line pt-2 text-[11px] leading-[1.6] text-soft">来源：{post.sourcePlatform}</p>
      )}

      <div className="mt-auto flex gap-3 pt-[10px] text-[11px] text-soft">
        <span className="inline-flex items-center gap-1"><Heart size={14} />{post.likes}</span>
        <span className="inline-flex items-center gap-1"><MessageCircle size={14} />{post.comments}</span>
        {/* 含链接标记：preview（富文本已剥标签，URL 文字保留）里带 http 链接或独立 url 字段（旧帖） */}
        {(hasUrl(post.preview) || post.url) && (
          <span className="text-primary">{post.url ? hostOf(post.url) : "含链接"}</span>
        )}
      </div>
    </Link>
  );
}
