/**
 * 查询层 · 互动域（S3 拆分 2026-08-29，自 lib/queries.ts 搬移，零逻辑改动）
 * 帖子点赞（likes）+ 关注（follows）家族：toggle 操作（RLS 校验本人）、计数、关注/粉丝列表
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserCardDTO } from "@/lib/types";

const LIKES = "likes";
const FOLLOWS = "follows";

async function currentUserId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/* ---------- 2c 帖子点赞（likes 表 + 触发器维护 square_posts.likes_count） ---------- */

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

/* ---------- D3 关注（follows 表，公开读 + 自写） ---------- */

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
