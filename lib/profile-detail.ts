/**
 * 页面数据加载层 · 用户主页（2026-09-03 自 app/(app)/profile/[id]/page.tsx 与 profile/page.tsx 收敛迁出，零逻辑改动）
 * 职责：users 资料查询（本人/他人同查询形状）+ 展示派生（name 兜底规则唯一出处）+ React cache 去重 + 并行编排。
 * page.tsx 不再内联任何数据访问或派生计算。
 *
 * React cache 语义（与迁移前一致）：getProfile 以 id 为 key → 同一次请求内
 * generateMetadata 与页面主体共享同一查询（不再查两遍）。
 * 注意：cache 仅单请求内去重；跨请求缓存（unstable_cache）另行评估（当前未引入）。
 */
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { fetchSquarePostsByAuthor } from "@/lib/queries/posts";
import { fetchFollowerCount, fetchFollowingCount } from "@/lib/queries/social";
import type { SquarePostDTO, UserBadge } from "@/lib/types";

/** users 行投影（本人/他人主页共用查询形状：个人品牌区可公开展示的 5 字段） */
export type ProfileRow = {
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  badge: string | null;
};

/** 主页展示派生结果（users 行 → ProfileView 直接可消费） */
export type ProfileDisplay = {
  name: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  badge: UserBadge;
};

/** users 行 → 展示派生（name 兜底规则唯一出处，2026-09-03 自两页重复收敛）：
 * row 可为 null（users 表无记录，如本人从未写资料）——空行语义，由兜底链接管。
 * self 仅本人主页提供（他人页无 user_metadata/email 数据可得）：
 * 兜底链 = row.name.trim() → self.metaName → self.email 前缀 → "引力用户"（他人页前两级缺省自动跳过） */
export function deriveProfileDisplay(row: ProfileRow | null, self?: { metaName?: string; email?: string }): ProfileDisplay {
  const metaName = (self?.metaName ?? "").trim();
  const emailName = (self?.email ?? "").split("@")[0]?.trim() ?? "";
  return {
    name: (row?.name ?? "").trim() || metaName || emailName || "引力用户",
    bio: row?.bio ?? "",
    avatarUrl: row?.avatar_url ?? "",
    coverUrl: row?.cover_url ?? "",
    badge: row?.badge === "official" || row?.badge === "discoverer" ? row.badge : "none",
  };
}

/** 按 id 查 users 行（本人页传 user.id，他人页传路由 id；同形状复用） */
export async function fetchProfileByUserId(supabase: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from("users")
    .select("name, bio, avatar_url, cover_url, badge")
    .eq("id", userId)
    .maybeSingle();
  return data as ProfileRow | null;
}

/** 他人资料（/profile/[id]；cache 工厂，generateMetadata 与页面主体共享同一查询） */
export const getProfile = cache(async (id: string): Promise<ProfileRow | null> => {
  const supabase = await createClient();
  return fetchProfileByUserId(supabase, id);
});

/** 他人主页取数编排结果（三态判别）：
 * - 正常他人：profile 非 null（渲染）
 * - 本人访问自己：{ profile: null, myId } 信号（page 层 redirect /profile；
 *   不查内容流——与迁移前一致：本人跳走省去无谓并行；users 行缺失亦 redirect 而非 404，语义保真）
 * - null：用户不存在且非本人（page 层 notFound 404） */
type ProfileDetail =
  | { profile: ProfileRow; myId: string; myPosts: SquarePostDTO[]; followerCount: number; followingCount: number }
  | { profile: null; myId: string };

/** 他人主页完整取数编排：登录态先行（本人 redirect 判断）→ 资料 + 发布内容流 + 粉丝/关注数并行。
 * 顺序与迁移前 [id]/page.tsx 一致：getUser → 本人判断 → 并行查询 */
export async function loadProfileDetail(id: string): Promise<ProfileDetail | null> {
  const supabase = await createClient();
  /* getUser 先行：本人判断不依赖 profile 存在 */
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user?.id ?? "";
  if (myId === id) return { profile: null, myId };

  /* getProfile 复用 generateMetadata 的缓存结果（同请求首查在 metadata 阶段已发生） */
  const profile = await getProfile(id);
  if (!profile) return null;

  const [myPosts, followerCount, followingCount] = await Promise.all([
    fetchSquarePostsByAuthor(supabase, id),
    fetchFollowerCount(supabase, id),
    fetchFollowingCount(supabase, id),
  ]);
  return { profile, myId, myPosts, followerCount, followingCount };
}
