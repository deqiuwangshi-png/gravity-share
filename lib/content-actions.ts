/**
 * 内容写动作层（2026-09-03，自 post-menu 组件下沉——组件职责分层，见 AGENTS.md）：
 * - deleteContent：按 targetType 删 square_posts / comments 行（RLS 作者校验），成功后联动清理配图
 * - 只做「数据操作 + storage 清理」，返回 ok/error；toast 反馈与导航（onDeleted/router.refresh）
 *   留在调用方组件层编排
 * 类型沿用调用方约定：targetType "square" | "comment"（discoveries 已随 016 内容池归一退役）
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { removeImage } from "@/lib/storage";

export type ContentTarget = "square" | "comment";

export type DeleteContentInput = {
  targetType: ContentTarget;
  targetId: string;
  /** 关联配图存储 path（post 桶），删除时联动清理 */
  imagePath?: string;
  /** 关联图集存储 path 数组（037），删除时与封面一起联动清理 */
  galleryPaths?: string[];
};

const CONTENT_TABLE: Record<ContentTarget, string> = {
  square: "square_posts",
  comment: "comments",
};

/**
 * 删除内容行 + 成功后联动清理配图（封面 + 图集全部；删图失败静默，避免孤儿文件）。
 * 返回 { ok: boolean }——写库失败为 false（组件 toast 提示），清理失败不影响 ok
 */
export async function deleteContent(
  supabase: SupabaseClient,
  input: DeleteContentInput,
): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from(CONTENT_TABLE[input.targetType])
    .delete()
    .eq("id", input.targetId);
  if (error) return { ok: false };
  /* 内容已删：配图联动清理（删图失败静默，避免孤儿文件） */
  [...new Set([...(input.galleryPaths ?? []), ...(input.imagePath ? [input.imagePath] : [])])].forEach(
    (path) => void removeImage("post", path).catch(() => {}),
  );
  return { ok: true };
}
