/**
 * 页面数据加载层 · 标签详情（2026-09-03 自 app/(app)/tag/[tag]/page.tsx 迁出，零逻辑改动）
 * 职责：标签内容流取数 + React cache 去重。page.tsx 不再内联 cache/createClient/取数。
 *
 * React cache 语义（与迁移前一致）：getPostsByTag 以 tag 为 key → 同一次请求内
 * generateMetadata（内容量阈值决定 index/noindex）与页面主体共享同一查询（不查两遍）。
 * 注意：cache 仅单请求内去重；跨请求缓存（unstable_cache）另行评估（当前未引入）。
 */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchSquarePostsByTag } from "@/lib/queries/posts";
import type { SquarePostDTO } from "@/lib/types";

/** 标签内容流（cache 工厂）：0 条 = 标签无内容（generateMetadata → 「标签不存在」noindex 语义 / 页面 notFound 404） */
export const getPostsByTag = cache(async (tag: string): Promise<SquarePostDTO[]> => {
  const supabase = await createClient();
  return fetchSquarePostsByTag(supabase, tag);
});
