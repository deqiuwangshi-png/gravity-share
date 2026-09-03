/**
 * 评论区（client，017 起）：顶层评论 + 一层回复嵌套 + 点赞 + 回复
 * - 点赞：comment_likes 表 + 触发器维护计数（可取消，挂载时批量查我的点赞态防 N+1）
 * - 回复：parent_id 指向顶层评论（一层嵌套；回复项只可赞不可再回复）
 * - 发评论：顶部 SquareCommentBox；发布/回复后刷新列表
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchCommentLikeMap, fetchComments, toggleCommentLike } from "@/lib/queries-comments";
import { SquareCommentBox } from "./square-comment-box";
import { PostMenu } from "@/components/app/common/post-menu";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { AuthorLink } from "@/components/app/common/author-link";
import { AuthorBadge } from "@/components/app/common/author-badge";
import type { CommentDTO } from "@/lib/types";

export function CommentSection({
  postId,
  initialComments,
  myId,
}: {
  postId: string;
  initialComments: CommentDTO[];
  myId: string;
}) {
  const [comments, setComments] = useState(initialComments);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const topComments = useMemo(() => comments.filter((c) => !c.parentId), [comments]);
  const repliesByParent = useMemo(() => {
    const map: Record<string, CommentDTO[]> = {};
    for (const c of comments) if (c.parentId) (map[c.parentId] ??= []).push(c);
    return map;
  }, [comments]);

  /* 挂载：批量查我的评论点赞态（一次 in 查询，避免每评论一次） */
  useEffect(() => {
    const ids = comments.map((c) => c.id);
    if (ids.length === 0) return;
    void fetchCommentLikeMap(createClient(), ids).then(setLikedMap).catch(() => {});
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载查一次，新评论默认未赞 */
  }, []);

  async function refresh() {
    try {
      setComments(await fetchComments(createClient(), postId));
    } catch { /* 刷新失败保持现状 */ }
  }

  async function onToggleLike(commentId: string) {
    try {
      const next = await toggleCommentLike(createClient(), commentId);
      setLikedMap((m) => ({ ...m, [commentId]: next }));
      setComments((list) =>
        list.map((c) => (c.id === commentId ? { ...c, likes: c.likes + (next ? 1 : -1) } : c)),
      );
    } catch { /* 写失败保持原状态（P1-3 回滚） */ }
  }

  function startReply(comment: CommentDTO) {
    setReplyTo({ id: comment.id, name: comment.authorName });
    setReplyText("");
  }

  async function sendReply() {
    const content = replyText.trim();
    if (!content || !replyTo || sendingReply) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSendingReply(true);
    const { error } = await supabase.from("comments").insert({
      id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      author_id: user.id,
      target_type: "square",
      target_id: postId,
      parent_id: replyTo.id,
      content,
    });
    setSendingReply(false);
    if (error) return;
    setReplyTo(null);
    setReplyText("");
    void refresh();
  }

  const commentActions = (comment: CommentDTO) => (
    <div className="mt-[6px] flex items-center gap-[14px]">
      {!comment.parentId && (
        <button type="button" className="inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[12px] text-soft transition-[color] duration-[180ms] hover:text-primary [font:inherit]" onClick={() => startReply(comment)}>
          <MessageCircle size={13} />回复
        </button>
      )}
      <button
        type="button"
        className={`inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[12px] text-soft transition-[color] duration-[180ms] hover:text-primary [font:inherit]${likedMap[comment.id] ? " text-primary" : ""}`}
        onClick={() => void onToggleLike(comment.id)}
        aria-pressed={likedMap[comment.id] ?? false}
        aria-label={likedMap[comment.id] ? "取消赞" : "赞"}
      >
        <Heart size={13} />{comment.likes}
      </button>
    </div>
  );

  return (
    <section className="mt-[22px]">
      <h2 className="m-0 mb-3 flex items-center gap-[6px] text-[15px]"><MessageCircle size={16} />评论 {comments.length}</h2>
      <SquareCommentBox postId={postId} onCreated={refresh} />
      <div className="grid">
        {topComments.map((comment) => (
          <div className="flex gap-[10px] border-b border-line py-[14px] last:border-b-0" key={comment.id}>
            <AvatarBox path={comment.authorAvatar} name={comment.authorName} className="grid size-[30px] shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary" badge={comment.authorBadge} authorId={comment.authorId} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <strong className="text-[12px]"><AuthorLink authorId={comment.authorId} name={comment.authorName} /><AuthorBadge badge={comment.authorBadge} /></strong>
                <small className="text-[11px] text-soft">{comment.time}</small>
                <PostMenu targetType="comment" targetId={comment.id} isOwner={comment.authorId === myId} content={comment.content} onDeleted={refresh} />
              </div>
              <p className="m-0 mt-1 whitespace-pre-line text-[13px] leading-[1.6] text-muted">{comment.content}</p>
              {commentActions(comment)}

              {replyTo?.id === comment.id && (
                <div className="mt-2 grid gap-2 rounded-[12px] border border-line bg-surface px-3 py-[10px] focus-within:border-line-primary">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder={`回复 @${replyTo.name}…`}
                    aria-label="回复内容"
                    autoFocus
                    className="min-h-10 resize-y border-0 bg-transparent px-[2px] py-1 text-[13px] leading-[1.6] text-foreground outline-none placeholder:text-soft [font:inherit]"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" className="cursor-pointer rounded-full border border-line bg-surface px-[14px] py-[5px] text-[12px] text-muted transition-[border-color,color] duration-[180ms] hover:border-line-primary hover:text-primary [font:inherit]" onClick={() => setReplyTo(null)}>取消</button>
                    <button type="button" className="cursor-pointer rounded-full border-0 bg-primary px-[14px] py-[5px] text-[12px] font-semibold text-on-primary transition-[background-color] duration-[180ms] hover:bg-primary-dark disabled:cursor-default disabled:text-disabled disabled:hover:text-on-primary [font:inherit]" disabled={!replyText.trim() || sendingReply} onClick={() => void sendReply()}>
                      {sendingReply ? "发送中…" : "回复"}
                    </button>
                  </div>
                </div>
              )}

              {repliesByParent[comment.id]?.map((reply) => (
                <div className="mt-2 flex gap-[10px] pt-3" key={reply.id}>
                  <AvatarBox path={reply.authorAvatar} name={reply.authorName} className="grid size-[30px] shrink-0 place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary" badge={reply.authorBadge} authorId={reply.authorId} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-[12px]"><AuthorLink authorId={reply.authorId} name={reply.authorName} /><AuthorBadge badge={reply.authorBadge} /></strong>
                      <small className="text-[11px] text-soft">{reply.time}</small>
                      <PostMenu targetType="comment" targetId={reply.id} isOwner={reply.authorId === myId} content={reply.content} onDeleted={refresh} />
                    </div>
                    <p className="m-0 mt-1 whitespace-pre-line text-[13px] leading-[1.6] text-muted">{reply.content}</p>
                    {commentActions(reply)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
