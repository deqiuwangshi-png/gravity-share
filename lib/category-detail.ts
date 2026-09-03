/**
 * 页面数据加载层 · 分类详情（2026-09-03 自 app/(app)/categories/[slug]/page.tsx 迁出，零逻辑改动）
 * 职责：slug → 分类解析 + 内容流取数编排。page.tsx 不再内联任何数据访问或 config 派生。
 *
 * 与 square-detail / profile-detail 的差异：本页 generateMetadata 不依赖取数
 * （分类元数据静态可得，无「metadata 与主体共享查询」需求）→ 不引入 React cache（避免无意义抽象）。
 */
import { createClient } from "@/lib/supabase/server";
import { fetchSquarePostsByCategory } from "@/lib/queries/posts";
import { SQUARE_CATEGORIES, SQUARE_CATEGORY_META } from "@/lib/config";
import type { SquarePostDTO } from "@/lib/types";

/** 分类元数据形状（SQUARE_CATEGORY_META 值类型收敛，供本层解析与返回类型使用） */
type CategoryMeta = { slug: string; icon: string; desc: string };

/** slug → 分类解析（generateMetadata 与 loadCategoryDetail 同源；无效 slug → null → 页面 404） */
export function resolveCategoryMeta(slug: string): { name: string; meta: CategoryMeta } | null {
  const name = SQUARE_CATEGORIES.find((n) => SQUARE_CATEGORY_META[n].slug === slug);
  if (!name) return null;
  return { name, meta: SQUARE_CATEGORY_META[name] };
}

/** 分类详情取数编排：解析 + 内容流（2026-09-02 B：按 category 直查走 026 (category, created_at) 复合索引，
 * 取代「拉最新 100 再内存 filter」——旧实现窗口锁死，分类在最新 100 里只有几条就只显示几条）。
 * 无效 slug → null（页面 notFound 404）；有效但无内容 → posts 空数组（页面空态，非 404） */
export async function loadCategoryDetail(
  slug: string,
): Promise<{ name: string; meta: CategoryMeta; posts: SquarePostDTO[] } | null> {
  const cat = resolveCategoryMeta(slug);
  if (!cat) return null;
  const supabase = await createClient();
  const posts = await fetchSquarePostsByCategory(supabase, cat.name);
  return { name: cat.name, meta: cat.meta, posts };
}
