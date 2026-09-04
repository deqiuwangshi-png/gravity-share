/**
 * 查询层 · 广场帖子域（S3 拆分 2026-08-29，自 lib/queries.ts 搬移，零逻辑改动）
 * 调用方注入 client（server 页面传 server.ts 的 cookie 客户端，client 组件传 client.ts 浏览器客户端），
 * 公开读依赖 RLS（anon + 登录用户都可见）
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SquarePostDTO } from "@/lib/types";
import { formatRelativeTime, safeName, stripHtml } from "@/lib/text";
import { isRichText } from "@/lib/rich-content";

const SQUARE = "square_posts";
const SQUARE_CARD_SELECT =
  "id, preview, title, post_type, commission, source_platform, category, tags, url, image_url, gallery, likes_count, comments_count, created_at, url_status, users!square_posts_author_id_fkey(id, name, avatar_url, badge)";

/** square_posts 行 + 关联作者名——导出供 DTO 映射测试构造 */
export type SquarePostRow = {
  id: string;
  content?: string;
  preview?: string | null;
  /* 038 可选用户标题（SEO L1；null = 未填写） */
  title: string | null;
  post_type: string;
  commission: string | null;
  source_platform: string | null;
  category: string;
  tags: string[];
  url: string | null;
  image_url: string | null;
  /* 037 图集：有序 storage path 数组（jsonb；空数组 = 旧帖回退正文内联图） */
  gallery: string[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  url_status: string;
  users: { id: string; name: string; avatar_url: string | null; badge: string | null } | null;
};

/** 卡片摘要（服务端生成，2026-09-02 规模化分析 A）：
 * 富文本帖剥标签 → 折叠空白 → 截 ≤160 字；纯文本帖只折叠截断（不经 stripHtml，避免误剥纯文本里的 <xxx> 片段）。
 * 与详情页 meta description（page.tsx 160 字）同长度口径 */
function cardPreview(content: string): string {
  const text = isRichText(content) ? stripHtml(content) : content;
  return text.replace(/\s+/g, " ").trim().slice(0, 160);
}

export function toSquarePostDTO(
  row: SquarePostRow,
  opts?: { content?: boolean },
): SquarePostDTO {
  return {
    id: row.id,
    authorId: row.users?.id ?? "",
    authorName: safeName(row.users?.name),
    authorAvatar: row.users?.avatar_url ?? undefined,
    authorBadge: (row.users?.badge as SquarePostDTO["authorBadge"]) ?? "none",
    /* 详情/作者流路径带全文；首页/分类/tag 大列表传 { content: false } 剥离（payload 优化，卡片消费 preview） */
    content: opts?.content === false ? "" : (row.content ?? ""),
    preview: row.preview ?? cardPreview(row.content ?? ""),
    title: row.title ?? undefined,
    postType: (row.post_type as "share" | "opportunity" | "content") ?? "share",
    commission: row.commission ?? undefined,
    sourcePlatform: row.source_platform ?? undefined,
    category: row.category ?? "其他",
    tags: row.tags,
    likes: row.likes_count,
    comments: row.comments_count,
    time: formatRelativeTime(row.created_at),
    createdAt: row.created_at,
    /* V8：外链处置（blocked 不渲染链接，内容保留） */
    url: row.url_status === "blocked" ? undefined : (row.url ?? undefined),
    urlStatus: (row.url_status as SquarePostDTO["urlStatus"]) ?? "normal",
    imageUrl: row.image_url ?? undefined,
    gallery: row.gallery ?? undefined,
  };
}

/** 相关文章规则：同分类优先，不足 4 条时按时间补充其他分类，最多返回 limit 条。 */
export function selectRelatedSquarePosts(
  sameCategory: SquarePostDTO[],
  otherCategories: SquarePostDTO[],
  limit = 6,
): SquarePostDTO[] {
  if (sameCategory.length >= 4) return sameCategory.slice(0, limit);
  return [...sameCategory, ...otherCategories].slice(0, limit);
}

/** 广场话题流（时间倒序；limit 供详情页相关区控制拉取量）
 * 2026-09-03：商业化模块删除 → 移除 024 置顶位（featured_until 双查询拆分），回归纯自然时间流 */
export async function fetchSquarePosts(supabase: SupabaseClient, limit?: number): Promise<SquarePostDTO[]> {
  const { data } = await supabase
    .from(SQUARE)
    .select(SQUARE_CARD_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit ?? 100);
  return (data as SquarePostRow[] | null)?.map((row) => toSquarePostDTO(row, { content: false })) ?? [];
}

/** 详情页相关文章：数据库先按分类和时间过滤，避免拉取全站最新 100 条后在 Node 内存筛选。 */
export async function fetchRelatedSquarePosts(
  supabase: SupabaseClient,
  category: string,
  excludeId: string,
  limit = 6,
): Promise<SquarePostDTO[]> {
  const sameResult = await supabase
    .from(SQUARE)
    .select(SQUARE_CARD_SELECT)
    .eq("category", category)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sameResult.error) throw sameResult.error;
  const sameCategory = ((sameResult.data as unknown as SquarePostRow[] | null) ?? []).map((row) =>
    toSquarePostDTO(row, { content: false }),
  );
  if (sameCategory.length >= 4 || sameCategory.length >= limit) {
    return sameCategory.slice(0, limit);
  }

  const otherLimit = limit - sameCategory.length;
  const otherResult = await supabase
    .from(SQUARE)
    .select(SQUARE_CARD_SELECT)
    .neq("category", category)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(otherLimit);

  if (otherResult.error) throw otherResult.error;
  const otherCategories = ((otherResult.data as unknown as SquarePostRow[] | null) ?? []).map((row) =>
    toSquarePostDTO(row, { content: false }),
  );
  return selectRelatedSquarePosts(sameCategory, otherCategories, limit);
}

/** 广场帖子详情（按 id） */
export async function fetchSquarePostById(supabase: SupabaseClient, id: string): Promise<SquarePostDTO | null> {
  const { data } = await supabase
    .from(SQUARE)
    .select("*, image_url, users!square_posts_author_id_fkey(id, name, avatar_url, badge)")
    .eq("id", id)
    .maybeSingle();
  return data ? toSquarePostDTO(data as SquarePostRow) : null;
}

/** 某用户发布的广场帖（个人主页「推荐」Tab，时间倒序）
 * 保留 content 全文：ProfileSquarePost 内联编辑（SquarePostEditForm）与卡片正文都消费 content */
export async function fetchSquarePostsByAuthor(supabase: SupabaseClient, userId: string): Promise<SquarePostDTO[]> {
  const { data } = await supabase
    .from(SQUARE)
    .select("*, image_url, users!square_posts_author_id_fkey(id, name, avatar_url, badge)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  return (data as SquarePostRow[] | null)?.map((row) => toSquarePostDTO(row)) ?? [];
}

/** 某分类下的公开帖（/categories/[slug] 用，2026-09-02 规模化分析 B）
 * 直接按 category 过滤走 026 现成 (category, created_at) 索引——取代旧的「拉最新 100 再内存 filter」
 * （窗口锁死：该分类在最新 100 里只有几条就只显示几条）；时间倒序 */
export async function fetchSquarePostsByCategory(
  supabase: SupabaseClient,
  category: string,
  limit?: number,
): Promise<SquarePostDTO[]> {
  const { data } = await supabase
    .from(SQUARE)
    .select(SQUARE_CARD_SELECT)
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(limit ?? 100);
  return (data as SquarePostRow[] | null)?.map((row) => toSquarePostDTO(row, { content: false })) ?? [];
}

/** 某标签下的公开帖（/tag/[tag] 用，P0-7；Postgres 数组包含查询，精确匹配 tags 元素） */
export async function fetchSquarePostsByTag(supabase: SupabaseClient, tag: string): Promise<SquarePostDTO[]> {
  const { data } = await supabase
    .from(SQUARE)
    .select(SQUARE_CARD_SELECT)
    .contains("tags", [tag])
    .order("created_at", { ascending: false });
  return (data as SquarePostRow[] | null)?.map((row) => toSquarePostDTO(row, { content: false })) ?? [];
}

/** 用户主页 id 清单（2026-08-25 sitemap 用：/profile/[id] 动态条目，时间倒序限条数） */
export async function fetchProfileIds(
  supabase: SupabaseClient,
  limit?: number,
): Promise<Array<{ id: string; createdAt: string }>> {
  const { data } = await supabase
    .from("users")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit ?? 500);
  return (data as Array<{ id: string; created_at: string }> | null)?.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
  })) ?? [];
}
