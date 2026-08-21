/**
 * 发现详情页（/discover/[id]，client）——最终规格（社交动态页）
 * 发帖头（头像+昵称+右侧时间）→ 正文（16px/1.7 白底黑字，URL 自动链接）→ 推广警示（合规）
 * → 外链预览卡（90×90 缩略图 + 标题 + 简介，整卡可点跳原平台）→ 互动栏（评论/点赞/浏览）
 * → 评论区（32 头像 + 楼主昵称品牌色高亮）→ 相关讨论 → 相关推荐
 * 无效 id → 404；单栏聚焦（V2 阅读页例外条款）
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import { DiscoveryCard } from "@/components/app/discovery/discovery-card";
import { LinkifiedText } from "@/components/app/common/linkified-text";
import { getDiscoveryItems } from "@/lib/discovery-store";
import { getSquarePosts } from "@/lib/square-store";
import { getDiscoveryComments } from "@/lib/data";

export default function DiscoverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const items = getDiscoveryItems();
  const item = items.find((entry) => entry.id === id);
  const [imgFailed, setImgFailed] = useState(false);
  const [comments, setComments] = useState(() => getDiscoveryComments(id as string));
  const [commentText, setCommentText] = useState("");
  if (!item) notFound();
  /* notFound 后 item 已收窄；current 供闭包引用（函数提升导致 TS 收窄失效） */
  const current = item;

  /* 相关推荐：同类型（排除当前），最多 4 条 */
  const related = items.filter((entry) => entry.id !== current.id && entry.type === current.type).slice(0, 4);

  /* 相关讨论：广场帖子按标签交集关联，最多 3 条 */
  const discussions = getSquarePosts()
    .filter((post) => post.tags.some((tag) => current.tags.includes(tag)))
    .slice(0, 3);

  const avatar = current.author?.charAt(0) ?? "推";
  const body = current.note ?? current.description ?? "";
  /* 外链预览卡：标题优先 title，否则正文前 40 字；简介仅在预置内容（与正文不同）时展示 */
  const linkTitle = current.title ?? body.slice(0, 40);
  const linkDesc = current.description && current.description !== current.note ? current.description : undefined;
  const commentCount = comments.length || current.comments || 0;

  /* 缩略图占位：按内容形态显示标记（无直链图时） */
  const kindMark = current.kind === "video" ? "▶ 视频" : current.kind === "doc" ? "DOC" : "链接";

  function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setComments((prev) => [
      ...prev,
      { id: `c${Date.now()}`, itemId: current.id, author: "我", content: text, time: "now", likes: 0 },
    ]);
    setCommentText("");
  }

  return (
    <div className="app-content discovery-detail-wrap">
      <article className="discovery-detail">
        <Link className="discovery-back" href="/discover">← 返回发现</Link>

        {/* ① 发帖头：彩色圆头像 + 昵称（加粗）+ 右侧时间 */}
        <div className="detail-user">
          <span className="detail-avatar">{avatar}</span>
          <b className="detail-username">{current.author ?? "引力推荐"}</b>
          <span className="detail-user-time">{current.publishTime ?? ""}</span>
        </div>

        {/* ② 正文：纯文本 16px/1.7，白底黑字，URL 自动链接 */}
        <p className="detail-body-text"><LinkifiedText text={body} /></p>

        {/* ③ 推广警示（合规：佣金 + 风险提示，commercial 必展示） */}
        {current.commercial && current.commission && (
          <p className="detail-promo-note"><b>⚠ 推广</b> · {current.promoType ?? "推广"} · {current.commission} · 交易风险自行判断</p>
        )}

        {/* ④ 外链预览卡：左缩略图 90×90 + 右标题/简介，整卡可点跳原平台 */}
        {current.url && (
          <a className="link-preview" href={current.url} target="_blank" rel="noopener noreferrer">
            <span className="link-preview-thumb">
              {current.kind === "image" && current.mediaUrl && !imgFailed ? (
                /* eslint-disable-next-line @next/next/no-img-element -- mock 直链图，接后端换 next/image */
                <img src={current.mediaUrl} alt="" onError={() => setImgFailed(true)} />
              ) : (
                <span className="link-preview-mark">{kindMark}</span>
              )}
            </span>
            <span className="link-preview-body">
              <b>{linkTitle}</b>
              {linkDesc && <small>{linkDesc}</small>}
            </span>
          </a>
        )}

        {/* ⑤ 互动栏：1px 细线分隔，评论 / 点赞 / 浏览 */}
        <div className="detail-bar">
          <span>{commentCount} 评论</span>
          <span>{current.likes ?? 0} 点赞</span>
          <span>{current.views ?? 0} 浏览</span>
        </div>

        {/* ⑥ 评论区：输入框 + 列表（楼主昵称品牌色高亮） */}
        <section className="detail-comments">
          <h2 className="detail-section-title">评论 · {commentCount}</h2>
          <form className="detail-comment-form" onSubmit={submitComment}>
            <input
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="说点什么…"
              aria-label="发表评论"
            />
            <button type="submit">评论</button>
          </form>
          {comments.length === 0 && <p className="detail-comment-empty">还没有评论，来抢沙发。</p>}
          {comments.map((comment) => {
            const isOwner = comment.author === current.author;
            return (
              <div className="detail-comment" key={comment.id}>
                <span className="detail-avatar detail-comment-avatar">{comment.author.charAt(0)}</span>
                <div className="detail-comment-body">
                  <p className="detail-comment-head">
                    <b className={isOwner ? "owner" : undefined}>{comment.author}</b>
                    <small>{comment.time}{comment.likes > 0 ? ` · ${comment.likes} 赞` : ""}</small>
                  </p>
                  <p className="detail-comment-content">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* ⑦ 相关讨论：广场关联帖 */}
        {discussions.length > 0 && (
          <section className="detail-section">
            <h2 className="detail-section-title">相关讨论 · 广场上的人怎么说</h2>
            {discussions.map((post) => (
              <Link className="detail-discuss" href={`/square/${post.id}`} key={post.id}>
                <p>{post.content.length > 60 ? `${post.content.slice(0, 60)}…` : post.content}</p>
                <small>{post.author} · {post.comments} 条回复</small>
              </Link>
            ))}
          </section>
        )}

        {/* ⑧ 相关推荐：同类内容 */}
        {related.length > 0 && (
          <section className="detail-section">
            <h2 className="detail-section-title">相关推荐 · 同类内容</h2>
            <div className="discovery-grid detail-related-grid">
              {related.map((entry) => <DiscoveryCard item={entry} key={entry.id} />)}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
