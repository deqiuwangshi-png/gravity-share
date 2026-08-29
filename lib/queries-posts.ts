/**
 * 查询层 · 广场帖子域（S3 拆分 2026-08-29，自 lib/queries.ts 搬移，零逻辑改动）
 * 调用方注入 client（server 页面传 server.ts 的 cookie 客户端，client 组件传 client.ts 浏览器客户端），
 * 公开读依赖 RLS（anon + 登录用户都可见）；bumpViews 走 RPC（security definer）
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SquarePostDTO } from "@/lib/types";
import { formatRelativeTime, safeName } from "@/lib/text";

const SQUARE = "square_posts";

/** square_posts 行 + 关联作者名——导出供 DTO 映射测试构造 */
export type SquarePostRow = {
  id: string;
  /* 029 帖子标题（短帖空串） */
  title: string;
  content: string;
  post_type: string;
  commission: string | null;
  source_platform: string | null;
  category: string;
  tags: string[];
  url: string | null;
  image_url: string | null;
  views: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  url_status: string;
  /* 024 展示位：置顶到期时间（NULL = 未置顶） */
  featured_until: string | null;
  users: { id: string; name: string; avatar_url: string | null; badge: string | null } | null;
};

export function toSquarePostDTO(row: SquarePostRow): SquarePostDTO {
  return {
    id: row.id,
    authorId: row.users?.id ?? "",
    authorName: safeName(row.users?.name),
    authorAvatar: row.users?.avatar_url ?? undefined,
    authorBadge: (row.users?.badge as SquarePostDTO["authorBadge"]) ?? "none",
    title: row.title ?? "",
    content: row.content,
    postType: (row.post_type as "share" | "opportunity" | "content") ?? "share",
    commission: row.commission ?? undefined,
    sourcePlatform: row.source_platform ?? undefined,
    category: row.category ?? "其他",
    tags: row.tags,
    likes: row.likes_count,
    comments: row.comments_count,
    views: row.views,
    time: formatRelativeTime(row.created_at),
    createdAt: row.created_at,
    /* V8：外链处置（blocked 不渲染链接，内容保留） */
    url: row.url_status === "blocked" ? undefined : (row.url ?? undefined),
    urlStatus: (row.url_status as SquarePostDTO["urlStatus"]) ?? "normal",
    imageUrl: row.image_url ?? undefined,
    /* 024 展示位：置顶中 = 到期时间 > 当前时刻（过期自动回落自然流） */
    featured: !!row.featured_until && new Date(row.featured_until).getTime() > Date.now(),
    featuredUntil: row.featured_until ?? undefined,
  };
}

/** 广场话题流（时间倒序；limit 供详情页相关区控制拉取量）
 * 024 展示位：置顶中（featured_until > now()）排最前，置顶内部按到期升序（快到期排前）；
 * 已过期帖视同普通帖（回落自然流，不占置顶位） */
export async function fetchSquarePosts(supabase: SupabaseClient, limit?: number): Promise<SquarePostDTO[]> {
  const now = new Date().toISOString();
  /* 置顶中（数量少，单独轻量查询） */
  const { data: featured } = await supabase
    .from(SQUARE)
    .select("*, image_url, users!square_posts_author_id_fkey(id, name, avatar_url, badge)")
    .gt("featured_until", now)
    .order("featured_until", { ascending: true })
    .limit(limit ?? 100);
  /* 普通帖（未置顶 + 已过期） */
  const { data: normal } = await supabase
    .from(SQUARE)
    .select("*, image_url, users!square_posts_author_id_fkey(id, name, avatar_url, badge)")
    .or(`featured_until.is.null,featured_until.lte.${now}`)
    .order("created_at", { ascending: false })
    .limit(limit ?? 100);
  return [
    ...((featured as SquarePostRow[] | null)?.map(toSquarePostDTO) ?? []),
    ...((normal as SquarePostRow[] | null)?.map(toSquarePostDTO) ?? []),
  ];
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

/** 某用户发布的广场帖（个人主页「推荐」Tab，时间倒序） */
export async function fetchSquarePostsByAuthor(supabase: SupabaseClient, userId: string): Promise<SquarePostDTO[]> {
  const { data } = await supabase
    .from(SQUARE)
    .select("*, image_url, users!square_posts_author_id_fkey(id, name, avatar_url, badge)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  return (data as SquarePostRow[] | null)?.map(toSquarePostDTO) ?? [];
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

/* ---------- BUG-4 浏览计数（RPC：security definer 只 +views，不放开表 update） ---------- */
/** 浏览 +1（square 详情页进入调用；失败静默不影响展示）
 * 2026-08-27 v2（迁移 023）：ip = 游客防刷键（x-forwarded-for 首段），
 * 游客 user_id 不绑定身份（NULL），仅帖子维度计数；登录用户保留作者不计 + 30 分钟去重 */
export async function bumpViews(supabase: SupabaseClient, targetId: string, ip?: string | null): Promise<void> {
  await supabase.rpc("bump_views", { target_type: "square", target_id: targetId, visitor_ip: ip ?? null });
}
