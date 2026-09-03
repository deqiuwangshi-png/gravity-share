/**
 * 查询层 · 评论域（S3 拆分 2026-08-29，自 lib/queries.ts 搬移，零逻辑改动）
 * 评论读取（RLS 公开）+ 评论点赞（comment_likes 表 + 触发器维护 comments.likes，RLS 校验本人）
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentDTO } from "@/lib/types";
import { formatRelativeTime, safeName } from "@/lib/text";

const COMMENTS = "comments";
const COMMENT_LIKES = "comment_likes";

/** comments 行 + 关联作者名——导出供 DTO 映射测试构造 */
export type CommentRow = {
  id: string;
  content: string;
  likes: number;
  parent_id: string | null;
  created_at: string;
  users: { id: string; name: string; avatar_url: string | null; badge: string | null } | null;
};

export function toCommentDTO(row: CommentRow): CommentDTO {
  return {
    id: row.id,
    authorId: row.users?.id ?? "",
    authorName: safeName(row.users?.name),
    authorAvatar: row.users?.avatar_url ?? undefined,
    authorBadge: (row.users?.badge as CommentDTO["authorBadge"]) ?? "none",
    content: row.content,
    time: formatRelativeTime(row.created_at),
    likes: row.likes,
    parentId: row.parent_id ?? undefined,
  };
}

/** 评论列表（square 帖子，时间正序；内容池归一后仅 square） */
export async function fetchComments(supabase: SupabaseClient, targetId: string): Promise<CommentDTO[]> {
  const { data } = await supabase
    .from(COMMENTS)
    .select("*, users!comments_author_id_fkey(id, name, avatar_url, badge)")
    .eq("target_type", "square")
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });
  return (data as CommentRow[] | null)?.map(toCommentDTO) ?? [];
}

/** 某用户发表过的评论（个人主页「评论」tab，时间倒序） */
export async function fetchCommentsByAuthor(supabase: SupabaseClient, userId: string): Promise<CommentDTO[]> {
  const { data } = await supabase
    .from(COMMENTS)
    .select("*, users!comments_author_id_fkey(id, name, avatar_url, badge)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  return (data as CommentRow[] | null)?.map(toCommentDTO) ?? [];
}

/* ---------- 017 评论点赞（comment_likes 表 + 触发器维护 comments.likes） ---------- */

/** 我是否已赞该评论（内部辅助，toggleCommentLike 用） */
async function isCommentLiked(supabase: SupabaseClient, commentId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from(COMMENT_LIKES)
    .select("comment_id")
    .eq("user_id", user.id)
    .eq("comment_id", commentId)
    .maybeSingle();
  return !!data;
}

/** 批量取我的评论点赞态（评论区挂载时一次 in 查询，避免每评论一次 N+1） */
export async function fetchCommentLikeMap(supabase: SupabaseClient, commentIds: string[]): Promise<Record<string, boolean>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || commentIds.length === 0) return {};
  const { data } = await supabase
    .from(COMMENT_LIKES)
    .select("comment_id")
    .eq("user_id", user.id)
    .in("comment_id", commentIds);
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) map[row.comment_id as string] = true;
  return map;
}

/** 评论点赞 toggle，返回新状态；失败抛错（调用方回滚）；计数由触发器维护（017） */
export async function toggleCommentLike(supabase: SupabaseClient, commentId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const liked = await isCommentLiked(supabase, commentId);
  if (liked) {
    const { error } = await supabase.from(COMMENT_LIKES).delete().eq("user_id", user.id).eq("comment_id", commentId);
    if (error) throw new Error("操作失败，请重试");
    return false;
  }
  const { error } = await supabase.from(COMMENT_LIKES).insert({ user_id: user.id, comment_id: commentId });
  if (error) throw new Error("操作失败，请重试");
  return true;
}
