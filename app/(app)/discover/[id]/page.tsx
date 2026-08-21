/**
 * 发现详情页（/discover/[id]，client）——最终规格（社交动态页）
 * 发帖头（头像+昵称+右侧时间）→ 正文（16px/1.7 白底黑字，URL 自动链接）→ 推广警示（合规）
 * → 外链预览卡（90×90 缩略图 + 标题 + 简介，整卡可点跳原平台）→ 互动栏（评论/点赞/浏览）
 * → 评论区（32 头像 + 楼主昵称品牌色高亮，2b 起落库）→ 相关讨论 → 相关推荐
 * 无效 id → 404；单栏聚焦（V2 阅读页例外条款）
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { DiscoveryCard } from "@/components/app/discovery/discovery-card";
import { LinkifiedText } from "@/components/app/common/linkified-text";
import { LoadError } from "@/components/app/common/load-error";
import { AuthorLink } from "@/components/app/common/author-link";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { createClient } from "@/lib/supabase/client";
import { bumpViews, fetchComments, fetchDiscoveries, fetchDiscoveryById, fetchSquarePosts, isLiked, toggleLike } from "@/lib/queries";
import type { CommentDTO, DiscoveryDTO, SquarePostDTO } from "@/lib/types";

type LoadState = "loading" | "ready" | "missing" | "error";

export default function DiscoverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>("loading");
  const [item, setItem] = useState<DiscoveryDTO | null>(null);
  const [all, setAll] = useState<DiscoveryDTO[]>([]);
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [discussions, setDiscussions] = useState<SquarePostDTO[]>([]);
  const [imgFailed, setImgFailed] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);

  const load = useCallback(() => {
    const supabase = createClient();
    /* BUG-4：进入详情 +1 浏览（失败静默，不影响展示） */
    void bumpViews(supabase, "discovery", id as string).catch(() => {});
    void Promise.all([
      fetchDiscoveryById(supabase, id as string),
      isLiked(createClient(), "discovery", id as string),
      fetchDiscoveries(supabase),
      fetchComments(supabase, "discovery", id as string),
      fetchSquarePosts(supabase),
    ])
      .then(([found, likedNow, allItems, commentList, postList]) => {
        if (!found) {
          setState("missing");
          return;
        }
        setItem(found);
        setLikesCount(found.likes);
        setLiked(likedNow);
        setAll(allItems);
        setComments(commentList);
        setDiscussions(postList.slice(0, 8));
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [id]);

  /* 重试（事件处理器内重置状态，避免 effect 内同步 setState） */
  function retry() {
    setState("loading");
    load();
  }

  async function onLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      const next = await toggleLike(createClient(), "discovery", id as string);
      setLiked(next);
      setLikesCount((c) => c + (next ? 1 : -1));
    } catch {
      /* 写失败保持原状态（P1-3 回滚，不再乐观更新） */
    }
    setLikeBusy(false);
  }

  useEffect(() => {
    load();
  }, [load]);

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = commentText.trim();
    if (!content || sending) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from("comments").insert({
      id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      author_id: user.id,
      target_type: "discovery",
      target_id: id,
      content,
    });
    setSending(false);
    if (error) return;
    setCommentText("");
    void fetchComments(createClient(), "discovery", id as string).then(setComments);
  }

  if (state === "loading") {
    return <div className="app-content discovery-detail-wrap"><p className="feed-loading">加载中…</p></div>;
  }
  if (state === "error") {
    return <div className="app-content discovery-detail-wrap"><LoadError onRetry={retry} /></div>;
  }
  if (state === "missing" || !item) notFound();
  const current = item;

  /* 相关讨论：广场帖子按标签交集关联，最多 3 条 */
  const relatedDiscussions = discussions
    .filter((post) => post.tags.some((tag) => current.tags.includes(tag)))
    .slice(0, 3);

  /* 相关推荐：同类型（排除当前），最多 4 条 */
  const related = all
    .filter((entry) => entry.id !== current.id && entry.type === current.type)
    .slice(0, 4);

  const body = current.note ?? current.description ?? "";
  const linkTitle = current.title ?? body.slice(0, 40);
  const linkDesc = current.description && current.description !== current.note ? current.description : undefined;
  /* 取两者较大值（BUG-15）：发评论后 comments.length 已含新评论，current.comments 为进入页时的库计数 */
  const commentCount = Math.max(current.comments, comments.length);
  const kindMark = current.kind === "video" ? "▶ 视频" : current.kind === "doc" ? "DOC" : "链接";

  return (
    <div className="app-content discovery-detail-wrap">
      <article className="discovery-detail">
        <Link className="discovery-back" href="/discover">← 返回发现</Link>

        {/* ① 发帖头：头像 + 昵称（加粗，可点跳主页）+ 右侧时间 */}
        <div className="detail-user">
          <AvatarBox path={current.authorAvatar} name={current.authorName ?? "推"} className="detail-avatar" />
          <b className="detail-username"><AuthorLink authorId={current.authorId} name={current.authorName ?? "引力推荐"} /></b>
          <span className="detail-user-time">{current.time ?? ""}</span>
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
                /* eslint-disable-next-line @next/next/no-img-element -- seed 直链图，后续换 next/image */
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

        {/* ⑤ 互动栏：1px 细线分隔，评论 / 点赞（可点，2c 落库）/ 浏览 */}
        <div className="detail-bar">
          <span>{commentCount} 评论</span>
          <button
            type="button"
            className={`detail-like${liked ? " active" : ""}`}
            onClick={() => void onLike()}
            aria-pressed={liked}
            disabled={likeBusy}
          >{liked ? "已赞" : "赞"} {likesCount}</button>
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
            <button type="submit" disabled={sending || !commentText.trim()}>{sending ? "发送中…" : "评论"}</button>
          </form>
          {comments.length === 0 && <p className="detail-comment-empty">还没有评论，来抢沙发。</p>}
          {comments.map((comment) => {
            const isOwner = comment.authorName === current.authorName;
            return (
              <div className="detail-comment" key={comment.id}>
                <AvatarBox path={comment.authorAvatar} name={comment.authorName} className="detail-avatar detail-comment-avatar" />
                <div className="detail-comment-body">
                  <p className="detail-comment-head">
                    <b className={isOwner ? "owner" : undefined}><AuthorLink authorId={comment.authorId} name={comment.authorName} /></b>
                    <small>{comment.time}{comment.likes > 0 ? ` · ${comment.likes} 赞` : ""}</small>
                  </p>
                  <p className="detail-comment-content">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* ⑦ 相关讨论：广场关联帖 */}
        {relatedDiscussions.length > 0 && (
          <section className="detail-section">
            <h2 className="detail-section-title">相关讨论 · 广场上的人怎么说</h2>
            {relatedDiscussions.map((post) => (
              <Link className="detail-discuss" href={`/square/${post.id}`} key={post.id}>
                <p>{post.content.length > 60 ? `${post.content.slice(0, 60)}…` : post.content}</p>
                <small>{post.authorName} · {post.comments} 条回复</small>
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
