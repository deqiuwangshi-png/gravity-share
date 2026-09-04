/**
 * 页面数据加载层 · square 帖子详情（2026-09-03 自 app/(app)/square/[id]/page.tsx 迁出，零逻辑改动）
 * 职责：详情页所需的取数 + React cache 去重 + 并行编排。page.tsx 不再内联任何数据访问。
 *
 * React cache 语义（与迁移前一致）：
 * - getPost 以 id 为 key → 同一次请求内 generateMetadata 与页面主体共享同一查询（P0-2，不再查两遍）
 * - getRelated 以 category+excludeId 为 key → 并行发、去重（P0-6）
 * 注意：cache 仅单请求内去重；如需跨请求缓存（unstable_cache）另行评估（当前未引入）。
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchComments } from "@/lib/queries/comments";
import { fetchRelatedSquarePosts, fetchSquarePostById } from "@/lib/queries/posts";
import type { CommentDTO } from "@/lib/types";
import type { SquarePostDTO } from "@/lib/types";

/** 帖子主体（含全文 content）：存在且 anon 可读才返回，否则 null（→ 页面 notFound 404） */
export const getPost = cache(async (id: string): Promise<SquarePostDTO | null> => {
  const supabase = await createClient();
  return fetchSquarePostById(supabase, id);
});

/** 相关文章（P0-6）：查询层负责分类过滤和数量控制（仅 loadSquareDetail 编排内部使用，非对外 API） */
const getRelated = cache(
  async (category: string, excludeId: string): Promise<SquarePostDTO[]> => {
    const supabase = await createClient();
    try {
      return await fetchRelatedSquarePosts(supabase, category, excludeId, 6);
    } catch (error) {
      console.error("Failed to load related square posts", error);
      return [];
    }
  },
);

/** 详情页完整取数编排：主体 + 评论 + 登录态 + 相关文章并行；
 * 帖子不存在/已删/读不到 → 返回 null（页面 notFound，省去无谓并行查询） */
export async function loadSquareDetail(
  id: string,
): Promise<{
  post: SquarePostDTO;
  comments: CommentDTO[];
  myId: string;
  related: SquarePostDTO[];
} | null> {
  const supabase = await createClient();
  /* getPost 复用 generateMetadata 的缓存结果（同请求首查在 metadata 阶段已发生） */
  const post = await getPost(id);
  if (!post) return null;
  const [comments, userRes, related] = await Promise.all([
    fetchComments(supabase, id),
    supabase.auth.getUser(),
    getRelated(post.category, post.id),
  ]);
  return {
    post,
    comments,
    myId: userRes.data.user?.id ?? "",
    related,
  };
}
