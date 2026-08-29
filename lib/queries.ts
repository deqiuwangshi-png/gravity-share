/**
 * 2b 数据查询层：内容 / 广场 / 评论 全部从 Supabase 读取
 * 调用方注入 client（server 页面传 server.ts 的 cookie 客户端，client 组件传 client.ts 浏览器客户端），
 * 公开读依赖 RLS（anon + 登录用户都可见）；写操作（发布/评论）在组件内直接用浏览器客户端 insert，靠 RLS 校验作者。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Announcement, CommentDTO, NotificationDTO, SquarePostDTO, UserCardDTO } from "@/lib/types";
import { formatRelativeTime } from "@/lib/text";

/** 数据变更事件（发布/评论写库后 dispatch，列表组件监听后重新拉取） */
export const SQUARE_UPDATED_EVENT = "square-updated";
/** 通知变更事件（已读/全部已读后 dispatch，顶栏铃铛刷新未读红点） */
export const NOTIFICATION_UPDATED_EVENT = "notification-updated";

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

/** comments 行 + 关联作者名——导出供 DTO 映射测试构造 */
export type CommentRow = {
  id: string;
  content: string;
  likes: number;
  parent_id: string | null;
  created_at: string;
  users: { id: string; name: string; avatar_url: string | null; badge: string | null } | null;
};

const SQUARE = "square_posts";
const COMMENTS = "comments";
const LIKES = "likes";
const COMMENT_LIKES = "comment_likes";
const FOLLOWS = "follows";
const NOTIFICATIONS = "notifications";
const ANNOUNCEMENTS = "announcements";
const LINK_DOMAINS = "link_domains";

/** users.name 可能为空字符串（注册未设置昵称）——空名一律回退「引力推荐」，避免头像空圈/空名展示 */
function safeName(name: string | null | undefined): string {
  return (name ?? "").trim() || "引力推荐";
}

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

/* ---------- 019 首页公告（走马灯） ---------- */

type AnnouncementRow = {
  id: string;
  kind: string;
  icon: string | null;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string | null;
};

function toAnnouncementDTO(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    kind: (row.kind as Announcement["kind"]) ?? "notice",
    icon: (row.icon as Announcement["icon"]) ?? undefined,
    title: row.title,
    desc: row.description ?? "",
    link: row.link ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

/** 上架公告（RLS 已过滤 active；时段过滤在查询层，按 sort 排序） */
export async function fetchAnnouncements(supabase: SupabaseClient): Promise<Announcement[]> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from(ANNOUNCEMENTS)
    .select("id, kind, icon, title, description, link, image_url")
    .eq("active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  return (data as AnnouncementRow[] | null)?.map(toAnnouncementDTO) ?? [];
}

/* ---------- 020 安全加固：外链域名信誉库（/go 分级用） ---------- */

/** 域名信誉库（link_domains 表，Table Editor 在线维护；trusted 直跳 / blocked 拦截） */
export async function fetchLinkDomains(supabase: SupabaseClient): Promise<{ trusted: Set<string>; blocked: Set<string> }> {
  const { data } = await supabase.from(LINK_DOMAINS).select("domain, kind");
  const trusted = new Set<string>();
  const blocked = new Set<string>();
  for (const row of (data as Array<{ domain: string; kind: string }> | null) ?? []) {
    if (row.kind === "trusted") trusted.add(row.domain.toLowerCase());
    else if (row.kind === "blocked") blocked.add(row.domain.toLowerCase());
  }
  return { trusted, blocked };
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

/* ---------- 2c 通知 ---------- */

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  target_type: string | null;
  item_id: string | null;
  created_at: string;
  actor: { id: string; name: string } | null;
};

function toNotificationDTO(row: NotificationRow): NotificationDTO {
  return {
    id: row.id,
    type: row.type,
    actorName: row.actor?.name ?? "引力用户",
    title: row.title,
    content: row.content,
    time: formatRelativeTime(row.created_at),
    read: row.read,
    targetType: (row.target_type as "square" | null) ?? undefined,
    itemId: row.item_id ?? undefined,
  };
}

/** 我的通知（RLS 本人，时间倒序，最多 20） */
export async function fetchNotifications(supabase: SupabaseClient): Promise<NotificationDTO[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  /* 嵌入 users 表（actor 昵称），通过 notifications 的 actor_id 外键；
   * 注意 PostgREST 语法：目标表名是 users 不是 notifications */
  const { data } = await supabase
    .from(NOTIFICATIONS)
    .select("*, actor:users!notifications_actor_id_fkey(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as NotificationRow[] | null)?.map(toNotificationDTO) ?? [];
}

/** 单条已读（点条目时） */
export async function markNotificationRead(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from(NOTIFICATIONS).update({ read: true }).eq("id", id);
}

/** 全部已读（抽屉头部按钮） */
export async function markAllNotificationsRead(supabase: SupabaseClient): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from(NOTIFICATIONS).update({ read: true }).eq("user_id", user.id);
}

/* ---------- 2c 互动（client 组件用，RLS 校验本人） ---------- */

async function currentUserId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** 我是否已赞（square 帖子） */
export async function isLiked(supabase: SupabaseClient, targetId: string): Promise<boolean> {
  const uid = await currentUserId(supabase);
  if (!uid) return false;
  const { data } = await supabase
    .from(LIKES)
    .select("user_id")
    .eq("user_id", uid)
    .eq("target_type", "square")
    .eq("target_id", targetId)
    .maybeSingle();
  return !!data;
}

/**
 * 点赞 toggle，返回新状态；计数由数据库触发器维护
 * 失败抛错（P1-3）：调用方 try/catch 保持原状态，避免 UI 与库漂移
 */
export async function toggleLike(supabase: SupabaseClient, targetId: string): Promise<boolean> {
  const uid = await currentUserId(supabase);
  if (!uid) return false;
  const liked = await isLiked(supabase, targetId);
  if (liked) {
    const { error } = await supabase.from(LIKES).delete().eq("user_id", uid).eq("target_type", "square").eq("target_id", targetId);
    if (error) throw new Error("操作失败，请重试");
    return false;
  }
  const { error } = await supabase.from(LIKES).insert({ user_id: uid, target_type: "square", target_id: targetId });
  if (error) throw new Error("操作失败，请重试");
  return true;
}

/* ---------- 017 评论点赞（comment_likes 表 + 触发器维护 comments.likes） ---------- */

/** 我是否已赞该评论（内部辅助，toggleCommentLike 用） */
async function isCommentLiked(supabase: SupabaseClient, commentId: string): Promise<boolean> {
  const uid = await currentUserId(supabase);
  if (!uid) return false;
  const { data } = await supabase
    .from(COMMENT_LIKES)
    .select("comment_id")
    .eq("user_id", uid)
    .eq("comment_id", commentId)
    .maybeSingle();
  return !!data;
}

/** 批量取我的评论点赞态（评论区挂载时一次 in 查询，避免每评论一次 N+1） */
export async function fetchCommentLikeMap(supabase: SupabaseClient, commentIds: string[]): Promise<Record<string, boolean>> {
  const uid = await currentUserId(supabase);
  if (!uid || commentIds.length === 0) return {};
  const { data } = await supabase
    .from(COMMENT_LIKES)
    .select("comment_id")
    .eq("user_id", uid)
    .in("comment_id", commentIds);
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) map[row.comment_id as string] = true;
  return map;
}

/** 评论点赞 toggle，返回新状态；失败抛错（调用方回滚）；计数由触发器维护（017） */
export async function toggleCommentLike(supabase: SupabaseClient, commentId: string): Promise<boolean> {
  const uid = await currentUserId(supabase);
  if (!uid) return false;
  const liked = await isCommentLiked(supabase, commentId);
  if (liked) {
    const { error } = await supabase.from(COMMENT_LIKES).delete().eq("user_id", uid).eq("comment_id", commentId);
    if (error) throw new Error("操作失败，请重试");
    return false;
  }
  const { error } = await supabase.from(COMMENT_LIKES).insert({ user_id: uid, comment_id: commentId });
  if (error) throw new Error("操作失败，请重试");
  return true;
}

/** 我是否已关注该用户 */
export async function isFollowing(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const uid = await currentUserId(supabase);
  if (!uid) return false;
  const { data } = await supabase
    .from(FOLLOWS)
    .select("follower_id")
    .eq("follower_id", uid)
    .eq("following_id", userId)
    .maybeSingle();
  return !!data;
}

/** 关注 toggle，返回新状态；失败抛错（P1-3） */
export async function toggleFollow(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const uid = await currentUserId(supabase);
  if (!uid || uid === userId) return false;
  const following = await isFollowing(supabase, userId);
  if (following) {
    const { error } = await supabase.from(FOLLOWS).delete().eq("follower_id", uid).eq("following_id", userId);
    if (error) throw new Error("操作失败，请重试");
    return false;
  }
  const { error } = await supabase.from(FOLLOWS).insert({ follower_id: uid, following_id: userId });
  if (error) throw new Error("操作失败，请重试");
  return true;
}

/** 粉丝数（follows 公开读） */
export async function fetchFollowerCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from(FOLLOWS)
    .select("follower_id", { count: "exact", head: true })
    .eq("following_id", userId);
  return count ?? 0;
}

/** 关注数 */
export async function fetchFollowingCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from(FOLLOWS)
    .select("following_id", { count: "exact", head: true })
    .eq("follower_id", userId);
  return count ?? 0;
}

/* ---------- D3 关注列表（join users 返回用户卡片，按关注/被关注时间倒序） ---------- */

type FollowRow = {
  following_id: string;
  follower_id: string;
  created_at: string;
  users: { id: string; name: string; bio: string | null; avatar_url: string | null } | null;
};

function toUserCardDTO(row: FollowRow, selfId: string): UserCardDTO {
  return {
    id: selfId,
    name: (row.users?.name ?? "").trim() || "引力用户",
    bio: row.users?.bio ?? "",
    avatarUrl: row.users?.avatar_url ?? undefined,
  };
}

/** 我关注的用户列表（join users，按关注时间倒序） */
export async function fetchFollowing(supabase: SupabaseClient, userId: string): Promise<UserCardDTO[]> {
  const { data } = await supabase
    .from(FOLLOWS)
    .select("following_id, created_at, users!follows_following_id_fkey(id, name, bio, avatar_url)")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  return (
    (data as Array<FollowRow & { following_id: string }> | null)?.map((row) => toUserCardDTO(row, row.following_id)) ?? []
  );
}

/** 关注我的人列表（join users，按被关注时间倒序） */
export async function fetchFollowers(supabase: SupabaseClient, userId: string): Promise<UserCardDTO[]> {
  const { data } = await supabase
    .from(FOLLOWS)
    .select("follower_id, created_at, users!follows_follower_id_fkey(id, name, bio, avatar_url)")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });
  return (
    (data as Array<FollowRow & { follower_id: string }> | null)?.map((row) => toUserCardDTO(row, row.follower_id)) ?? []
  );
}

/** 我关注的所有用户 id（粉丝页判断每项关注态，一次查询避免 N+1） */
export async function fetchFollowingIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase.from(FOLLOWS).select("following_id").eq("follower_id", userId);
  return (data as Array<{ following_id: string }> | null)?.map((row) => row.following_id) ?? [];
}

/* ---------- 021 官方认证（verifications 申请表，本人读） ---------- */

export type VerificationRow = {
  id: string;
  vtype: "personal" | "organization" | "enterprise";
  statement: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

/** 我的认证申请（RLS 本人读；最新一条在前） */
export async function fetchVerifications(supabase: SupabaseClient): Promise<VerificationRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("verifications")
    .select("id, vtype, statement, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data as VerificationRow[] | null) ?? [];
}

/* ---------- BUG-4 浏览计数（RPC：security definer 只 +views，不放开表 update） ---------- */
/** 浏览 +1（square 详情页进入调用；失败静默不影响展示）
 * 2026-08-27 v2（迁移 023）：ip = 游客防刷键（x-forwarded-for 首段），
 * 游客 user_id 不绑定身份（NULL），仅帖子维度计数；登录用户保留作者不计 + 30 分钟去重 */
export async function bumpViews(supabase: SupabaseClient, targetId: string, ip?: string | null): Promise<void> {
  await supabase.rpc("bump_views", { target_type: "square", target_id: targetId, visitor_ip: ip ?? null });
}

/* ---------- 敏感操作 re-auth（2026-08-29，账号劫持防线） ---------- */

/** 用当前密码验证身份（注销 / 修改密码 / 修改邮箱共用）：
 * signInWithPassword 仅作校验，失败返回 false，成功顺带刷新会话。
 * 若 session 无邮箱（异常态）一律拒绝，宁可不放行。 */
export async function verifyCurrentPassword(supabase: SupabaseClient, password: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
  return !error;
}
