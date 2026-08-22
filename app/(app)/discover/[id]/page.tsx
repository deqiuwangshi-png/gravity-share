/**
 * 发现详情页（/discover/[id]，client）——最终规格（社交动态页）
 * 发帖头（头像+昵称+右侧时间）→ 正文（16px/1.7 白底黑字，URL 自动链接）→ 推广警示（合规）
 * → 外链预览卡（90×90 缩略图 + 标题 + 简介，整卡可点跳原平台）→ 互动栏（评论/点赞/浏览，带图标）
 * → 评论区（32 头像 + 楼主昵称品牌色高亮，2b 起落库，水平三点操作菜单）→ 相关讨论 → 相关推荐
 * 加载优化：主体（帖子+评论+点赞态）先到先渲染，相关区（发现流/广场流）后台补齐，不阻塞首屏
 * 无效 id → 404；单栏聚焦（V2 阅读页例外条款）
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { DiscoveryCard } from "@/components/app/discovery/discovery-card";
import { LinkifiedText } from "@/components/app/common/linkified-text";
import { LoadError } from "@/components/app/common/load-error";
import { AuthorLink } from "@/components/app/common/author-link";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { CommentMenu } from "@/components/app/common/comment-menu";
import { CommentIcon, LikeIcon, ViewIcon } from "@/components/app/common/action-icons";
import { PostMenu } from "@/components/app/common/post-menu";
import { useToast } from "@/components/app/common/toast";
import { createClient } from "@/lib/supabase/client";
import { publicImageUrl } from "@/lib/storage";
import { safeHref } from "@/lib/links";
import { bumpViews, fetchComments, fetchDiscoveries, fetchDiscoveryById, fetchSquarePosts, isLiked, toggleLike } from "@/lib/queries";
import type { CommentDTO, DiscoveryDTO, SquarePostDTO } from "@/lib/types";

type LoadState = "loading" | "ready" | "missing" | "error";

export default function DiscoverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
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
  const [myId, setMyId] = useState("");
  /* 正文内联编辑（统一 PostMenu 的「修改」入口，仅改 note） */
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);

  const load = useCallback(() => {
    const supabase = createClient();
    /* BUG-4：进入详情 +1 浏览（失败静默，不影响展示；013 起作者本人不计、30 分钟去重） */
    void bumpViews(supabase, "discovery", id as string).catch(() => {});
    void supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? ""));
    /* 主体：帖子 + 点赞态 + 评论 —— 到齐即渲染 */
    void Promise.all([
      fetchDiscoveryById(supabase, id as string),
      isLiked(supabase, "discovery", id as string),
      fetchComments(supabase, "discovery", id as string),
    ])
      .then(([found, likedNow, commentList]) => {
        if (!found) {
          setState("missing");
          return;
        }
        setItem(found);
        setLikesCount(found.likes);
        setLiked(likedNow);
        setComments(commentList);
        setState("ready");
      })
      .catch(() => setState("error"));
    /* 相关区：后台补齐，不阻塞首屏（限定条数，防全表拖慢） */
    void Promise.all([
      fetchDiscoveries(supabase, { to: 39 }),
      fetchSquarePosts(supabase, 30),
    ])
      .then(([allItems, postList]) => {
        setAll(allItems);
        setDiscussions(postList);
      })
      .catch(() => { /* 相关区失败静默：主体仍正常展示 */ });
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

  async function submitComment(event: React.SyntheticEvent<HTMLFormElement>) {
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

  /** 评论框 Enter 发送，Shift+Enter 换行 */
  function onCommentKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  /** 正文内联编辑保存（仅改 note；RLS 作者校验） */
  async function onSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = editText.trim();
    if (!text || saveBusy) return;
    setSaveBusy(true);
    const { error } = await createClient().from("discoveries").update({ note: text }).eq("id", id as string);
    setSaveBusy(false);
    if (error) {
      show("保存失败，请重试", "danger");
      return;
    }
    setEditing(false);
    load();
  }

  function reloadComments() {
    void fetchComments(createClient(), "discovery", id as string).then(setComments);
  }

  if (state === "loading") {
    return (
      <div className="app-content discovery-detail-wrap">
        <article className="discovery-detail">
          <div className="detail-skeleton detail-skeleton-head" />
          <div className="detail-skeleton detail-skeleton-line" />
          <div className="detail-skeleton detail-skeleton-line short" />
          <div className="detail-skeleton detail-skeleton-card" />
          <div className="detail-skeleton detail-skeleton-line" />
        </article>
      </div>
    );
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
  /* 正文区：编辑态替换为内联编辑表单（统一 PostMenu 的「修改」） */
  const bodyArea = editing ? (
    <form className="detail-post-edit" onSubmit={(event) => void onSaveEdit(event)}>
      <textarea rows={5} value={editText} onChange={(event) => setEditText(event.target.value)} aria-label="编辑正文" autoFocus />
      <div className="detail-post-edit-actions">
        <button type="button" onClick={() => { setEditing(false); setEditText(body); }}>取消</button>
        <button type="submit" disabled={saveBusy || !editText.trim()}>{saveBusy ? "保存中…" : "保存"}</button>
      </div>
    </form>
  ) : (
    <p className="detail-body-text"><LinkifiedText text={body} /></p>
  );

  return (
    <div className="app-content discovery-detail-wrap">
      <article className="discovery-detail">
        <Link className="discovery-back" href="/home">← 返回首页</Link>

        {/* ① 发帖头：头像 + 昵称（加粗，可点跳主页）+ 右侧时间 + 统一三点菜单（PostMenu） */}
        <div className="detail-user">
          <AvatarBox
            path={current.authorAvatar}
            name={current.authorName ?? "推"}
            className="detail-avatar"
            authorId={current.authorId}
          />
          <b className="detail-username"><AuthorLink authorId={current.authorId} name={current.authorName ?? "引力推荐"} /></b>
          <span className="detail-user-time">{current.time ?? ""}</span>
          <PostMenu
            targetType="discovery"
            targetId={current.id}
            isOwner={myId === current.authorId}
            content={body}
            shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/discover/${current.id}`}
            imagePath={current.mediaUrl}
            onEdit={() => {
              setEditText(body);
              setEditing(true);
            }}
            onDeleted={() => router.replace("/home")}
          />
        </div>

        {current.commercial ? (
          /* 推广内容（2026-08-22 文章结构纠正）：图片第一 → 正文第二 → 网址第三
           * 图片是给用户了解推广对象的（不引用为外链缩略图，不可点跳转）；网址原样展示 */
          <>
            {current.mediaUrl && !imgFailed && (
              /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */
              <img
                className="detail-promo-image"
                src={publicImageUrl("post", current.mediaUrl)}
                alt="推广图片"
                onError={() => setImgFailed(true)}
              />
            )}
            {bodyArea}
            {/* 推广警示（合规：commercial 必展示官方标识；商业说明选填拼接） */}
            <p className="detail-promo-note"><b>⚠ 推广</b> · {current.promoType ?? "推广"}{current.commission ? ` · ${current.commission}` : ""}</p>
            {current.url && (
              <p className="detail-promo-url">
                <a href={safeHref(current.url) ?? current.url} target="_blank" rel="noopener noreferrer">{current.url}</a>
              </p>
            )}
          </>
        ) : (
          /* 普通内容（布局不动）：正文 + 外链预览卡 */
          <>
            {bodyArea}
            {current.url && (
              <a className="link-preview" href={safeHref(current.url) ?? current.url} target="_blank" rel="noopener noreferrer">
                <span className="link-preview-thumb">
                  {current.mediaUrl && !imgFailed ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- seed 直链图 / 内容图 */
                    <img src={publicImageUrl("post", current.mediaUrl)} alt="" onError={() => setImgFailed(true)} />
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
          </>
        )}

        {/* ⑤ 互动栏：1px 细线分隔，评论 / 点赞（可点，2c 落库）/ 浏览，均带图标（体验修复） */}
        <div className="detail-bar">
          <span><CommentIcon />{commentCount} 评论</span>
          <button
            type="button"
            className={`detail-like${liked ? " active" : ""}`}
            onClick={() => void onLike()}
            aria-pressed={liked}
            disabled={likeBusy}
          ><LikeIcon />{liked ? "已赞" : "赞"} {likesCount}</button>
          <span><ViewIcon />{current.views ?? 0} 浏览</span>
        </div>

        {/* ⑥ 评论区：输入框（多行）+ 列表（楼主昵称品牌色高亮 + 水平三点操作菜单） */}
        <section className="detail-comments">
          <h2 className="detail-section-title"><CommentIcon size={16} />评论 · {commentCount}</h2>
          <form className="detail-comment-form" onSubmit={submitComment}>
            <textarea
              rows={2}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={onCommentKeyDown}
              placeholder="说点什么…（Enter 发送，Shift+Enter 换行）"
              aria-label="发表评论"
            />
            <button type="submit" disabled={sending || !commentText.trim()}>{sending ? "发送中…" : "评论"}</button>
          </form>
          {comments.length === 0 && <p className="detail-comment-empty">还没有评论，来抢沙发。</p>}
          {comments.map((comment) => {
            const isOwner = comment.authorName === current.authorName;
            return (
              <div className="detail-comment" key={comment.id}>
                <AvatarBox
                  path={comment.authorAvatar}
                  name={comment.authorName}
                  className="detail-avatar detail-comment-avatar"
                  authorId={comment.authorId}
                />
                <div className="detail-comment-body">
                  {/* 头部行用 div 而非 p：内含 CommentMenu（div），p 不能嵌套 div（防 hydration 报错） */}
                  <div className="detail-comment-head">
                    <b className={isOwner ? "owner" : undefined}><AuthorLink authorId={comment.authorId} name={comment.authorName} /></b>
                    <small>{comment.time}{comment.likes > 0 ? ` · ${comment.likes} 赞` : ""}</small>
                    <CommentMenu comment={comment} isOwner={comment.authorId === myId} onDeleted={reloadComments} />
                  </div>
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
