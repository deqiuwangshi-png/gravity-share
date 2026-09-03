/**
 * 评论写动作层（2026-09-03，收口 square-comment-box 与 comment-section.sendReply
 * 两处同款内联 comments.insert——组件职责分层，见 AGENTS.md）：
 * - createComment：insert comments（RLS 校验作者）+ 防重复短 id 生成，返回 { ok }
 * 组件保留：auth.getUser（用户态获取）、text/sending/error 受控态、成功后的刷新
 *   （onCreated / router.refresh / 列表 refresh）
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateCommentInput = {
  authorId: string;
  /** 目标帖（comments.target_type 恒 "square"——单一内容池 square_posts） */
  postId: string;
  content: string;
  /** 回复时指向顶层评论 id（一层嵌套；置顶评论无此字段） */
  parentId?: string;
};

/**
 * 发评论 / 回复。返回 { ok: boolean }——写库失败为 false（组件提示），成功由组件决定刷新方式
 */
export async function createComment(
  supabase: SupabaseClient,
  input: CreateCommentInput,
): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("comments").insert({
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    author_id: input.authorId,
    target_type: "square",
    target_id: input.postId,
    ...(input.parentId ? { parent_id: input.parentId } : {}),
    content: input.content,
  });
  return { ok: !error };
}
