/**
 * 2b 数据查询层：内容 / 广场 / 评论 全部从 Supabase 读取
 * 调用方注入 client（server 页面传 server.ts 的 cookie 客户端，client 组件传 client.ts 浏览器客户端），
 * 公开读依赖 RLS（anon + 登录用户都可见）；写操作（发布/评论）在组件内直接用浏览器客户端 insert，靠 RLS 校验作者。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommentDTO, DiscoveryDTO, DiscoveryKind, NotificationDTO, SquarePostDTO } from "@/lib/types";
import { formatRelativeTime } from "@/lib/text";

/** 数据变更事件（发布/评论写库后 dispatch，列表组件监听后重新拉取） */
export const DISCOVERY_UPDATED_EVENT = "discovery-updated";
export const SQUARE_UPDATED_EVENT = "square-updated";
/** 通知变更事件（已读/全部已读后 dispatch，顶栏铃铛刷新未读红点） */
export const NOTIFICATION_UPDATED_EVENT = "notification-updated";

/** discoveries 行 + 关联作者名（join users.name） */
type DiscoveryRow = {
  id: string;
  type: string;
  title: string | null;
  note: string;
  description: string | null;
  source: string;
  origin: string | null;
  tags: string[];
  commercial: boolean;
  promo_type: string | null;
  commission: string | null;
  url: string | null;
  kind: string;
  media_url: string | null;
  reason: string | null;
  views: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  users: { id: string; name: string; avatar_url: string | null } | null;
};

/** square_posts 行 + 关联作者名 */
type SquarePostRow = {
  id: string;
  content: string;
  tags: string[];
  url: string | null;
  image_url: string | null;
  views: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  users: { id: string; name: string; avatar_url: string | null } | null;
};

/** comments 行 + 关联作者名 */
type CommentRow = {
  id: string;
  content: string;
  likes: number;
  created_at: string;
  users: { id: string; name: string; avatar_url: string | null } | null;
};

const KIND = "discoveries";
const SQUARE = "square_posts";
const COMMENTS = "comments";
const LIKES = "likes";
const FAVORITES = "favorites";
const FOLLOWS = "follows";
const NOTIFICATIONS = "notifications";

function toDiscoveryDTO(row: DiscoveryRow): DiscoveryDTO {
  return {
    id: row.id,
    type: row.type,
    title: row.title ?? undefined,
    note: row.note,
    description: row.description ?? undefined,
    authorId: row.users?.id ?? "",
    authorName: row.users?.name ?? "引力推荐",
    authorAvatar: row.users?.avatar_url ?? undefined,
    time: formatRelativeTime(row.created_at),
    views: row.views,
    likes: row.likes_count,
    comments: row.comments_count,
    tags: row.tags,
    source: row.source,
    origin: row.origin ?? undefined,
    commercial: row.commercial,
    promoType: row.promo_type ?? undefined,
    commission: row.commission ?? undefined,
    url: row.url ?? undefined,
    kind: (row.kind as DiscoveryKind) ?? "link",
    mediaUrl: row.media_url ?? undefined,
    reason: row.reason ?? undefined,
  };
}

function toSquarePostDTO(row: SquarePostRow): SquarePostDTO {
  return {
    id: row.id,
    authorId: row.users?.id ?? "",
    authorName: row.users?.name ?? "引力推荐",
    authorAvatar: row.users?.avatar_url ?? undefined,
    content: row.content,
    tags: row.tags,
    likes: row.likes_count,
    comments: row.comments_count,
    views: row.views,
    time: formatRelativeTime(row.created_at),
    url: row.url ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

function toCommentDTO(row: CommentRow): CommentDTO {
  return {
    id: row.id,
    authorId: row.users?.id ?? "",
    authorName: row.users?.name ?? "引力推荐",
    authorAvatar: row.users?.avatar_url ?? undefined,
    content: row.content,
    time: formatRelativeTime(row.created_at),
    likes: row.likes,
  };
}

/** 发现流（时间倒序） */
export async function fetchDiscoveries(supabase: SupabaseClient): Promise<DiscoveryDTO[]> {
  const { data } = await supabase
    .from(KIND)
    .select("*, users!discoveries_author_id_fkey(id, name, avatar_url)")
    .order("created_at", { ascending: false });
  return (data as DiscoveryRow[] | null)?.map(toDiscoveryDTO) ?? [];
}

/** 发现详情（按 id） */
export async function fetchDiscoveryById(supabase: SupabaseClient, id: string): Promise<DiscoveryDTO | null> {
  const { data } = await supabase
    .from(KIND)
    .select("*, users!discoveries_author_id_fkey(id, name, avatar_url)")
    .eq("id", id)
    .maybeSingle();
  return data ? toDiscoveryDTO(data as DiscoveryRow) : null;
}

/** /home 推荐位（reason 非空，最多 6 条） */
export async function fetchRecommended(supabase: SupabaseClient): Promise<DiscoveryDTO[]> {
  const { data } = await supabase
    .from(KIND)
    .select("*, users!discoveries_author_id_fkey(id, name, avatar_url)")
    .not("reason", "is", null)
    .order("created_at", { ascending: false })
    .limit(6);
  return (data as DiscoveryRow[] | null)?.map(toDiscoveryDTO) ?? [];
}

/** 某用户发布的发现（个人主页「我的帖子」） */
export async function fetchDiscoveriesByAuthor(supabase: SupabaseClient, userId: string): Promise<DiscoveryDTO[]> {
  const { data } = await supabase
    .from(KIND)
    .select("*, users!discoveries_author_id_fkey(id, name, avatar_url)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  return (data as DiscoveryRow[] | null)?.map(toDiscoveryDTO) ?? [];
}

/** 广场话题流（时间倒序） */
export async function fetchSquarePosts(supabase: SupabaseClient): Promise<SquarePostDTO[]> {
  const { data } = await supabase
    .from(SQUARE)
    .select("*, image_url, users!square_posts_author_id_fkey(id, name, avatar_url)")
    .order("created_at", { ascending: false });
  return (data as SquarePostRow[] | null)?.map(toSquarePostDTO) ?? [];
}

/** 广场帖子详情（按 id） */
export async function fetchSquarePostById(supabase: SupabaseClient, id: string): Promise<SquarePostDTO | null> {
  const { data } = await supabase
    .from(SQUARE)
    .select("*, image_url, users!square_posts_author_id_fkey(id, name, avatar_url)")
    .eq("id", id)
    .maybeSingle();
  return data ? toSquarePostDTO(data as SquarePostRow) : null;
}

/** 评论列表（discovery / square 归一，时间正序） */
export async function fetchComments(
  supabase: SupabaseClient,
  targetType: "discovery" | "square",
  targetId: string,
): Promise<CommentDTO[]> {
  const { data } = await supabase
    .from(COMMENTS)
    .select("*, users!comments_author_id_fkey(id, name, avatar_url)")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });
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
    targetType: (row.target_type as "discovery" | "square" | null) ?? undefined,
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

/** 我是否已赞（target_type: discovery / square） */
export async function isLiked(
  supabase: SupabaseClient,
  targetType: "discovery" | "square",
  targetId: string,
): Promise<boolean> {
  const uid = await currentUserId(supabase);
  if (!uid) return false;
  const { data } = await supabase
    .from(LIKES)
    .select("user_id")
    .eq("user_id", uid)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();
  return !!data;
}

/** 点赞 toggle，返回新状态；计数由数据库触发器维护 */
export async function toggleLike(
  supabase: SupabaseClient,
  targetType: "discovery" | "square",
  targetId: string,
): Promise<boolean> {
  const uid = await currentUserId(supabase);
  if (!uid) return false;
  const liked = await isLiked(supabase, targetType, targetId);
  if (liked) {
    await supabase.from(LIKES).delete().eq("user_id", uid).eq("target_type", targetType).eq("target_id", targetId);
    return false;
  }
  await supabase.from(LIKES).insert({ user_id: uid, target_type: targetType, target_id: targetId });
  return true;
}

/** 我是否已收藏某发现 */
export async function isFavorited(supabase: SupabaseClient, discoveryId: string): Promise<boolean> {
  const uid = await currentUserId(supabase);
  if (!uid) return false;
  const { data } = await supabase
    .from(FAVORITES)
    .select("user_id")
    .eq("user_id", uid)
    .eq("discovery_id", discoveryId)
    .maybeSingle();
  return !!data;
}

/** 收藏 toggle，返回新状态 */
export async function toggleFavorite(supabase: SupabaseClient, discoveryId: string): Promise<boolean> {
  const uid = await currentUserId(supabase);
  if (!uid) return false;
  const favorited = await isFavorited(supabase, discoveryId);
  if (favorited) {
    await supabase.from(FAVORITES).delete().eq("user_id", uid).eq("discovery_id", discoveryId);
    return false;
  }
  await supabase.from(FAVORITES).insert({ user_id: uid, discovery_id: discoveryId });
  return true;
}

/** 我的收藏列表（个人主页收藏 tab，join discoveries + 作者） */
export async function fetchFavorites(supabase: SupabaseClient): Promise<DiscoveryDTO[]> {
  const uid = await currentUserId(supabase);
  if (!uid) return [];
  /* 双重嵌套需显式 FK：favorites→discoveries（favorites_discovery_id_fkey）→ users（discoveries_author_id_fkey），
   * 否则 favorites 自身指向 users 的 user_id 外键会造成歧义（PostgREST 300） */
  const { data } = await supabase
    .from(FAVORITES)
    .select("discoveries!favorites_discovery_id_fkey(*, users!discoveries_author_id_fkey(id, name, avatar_url))")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  return (
    (data as Array<{ discoveries: DiscoveryRow | null }> | null)
      ?.map((row) => (row.discoveries ? toDiscoveryDTO(row.discoveries) : null))
      .filter((item): item is DiscoveryDTO => item !== null) ?? []
  );
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

/** 关注 toggle，返回新状态 */
export async function toggleFollow(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const uid = await currentUserId(supabase);
  if (!uid || uid === userId) return false;
  const following = await isFollowing(supabase, userId);
  if (following) {
    await supabase.from(FOLLOWS).delete().eq("follower_id", uid).eq("following_id", userId);
    return false;
  }
  await supabase.from(FOLLOWS).insert({ follower_id: uid, following_id: userId });
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
