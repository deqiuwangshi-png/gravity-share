/**
 * 个人主页（/profile）——server 端读 Supabase 会话与用户资料
 * 未登录 → /login（proxy 已拦截，双保险）；用户资料传入 ProfileView（client）
 * 2026-08-25 SEO：私人后台页，noindex（不进搜索结果）
 * 2026-09-03：资料查询 + 展示派生收敛至 lib/profile-detail.ts
 *   （fetchProfileByUserId + deriveProfileDisplay——与 /profile/[id] 共享同一 name 兜底规则唯一出处）
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deriveProfileDisplay, fetchProfileByUserId } from "@/lib/profile-detail";
import { fetchFollowingCount, fetchFollowerCount } from "@/lib/queries/social";
import ProfileView from "@/components/app/shell/profile-view";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  /* 读 public.users 资料（RLS：auth.uid() = id，仅自己）+ 粉丝/关注计数并行 */
  const [profile, followerCount, followingCount] = await Promise.all([
    fetchProfileByUserId(supabase, user.id),
    fetchFollowerCount(supabase, user.id),
    fetchFollowingCount(supabase, user.id),
  ]);
  /* 派生收敛：本人兜底链含 user_metadata/email（他人页无此数据，见 deriveProfileDisplay self 参数） */
  const display = deriveProfileDisplay(profile, {
    metaName: (user.user_metadata?.name as string | undefined) ?? undefined,
    email: user.email ?? undefined,
  });

  return (
    <ProfileView
      name={display.name}
      bio={display.bio}
      userId={user.id}
      followerCount={followerCount}
      followingCount={followingCount}
      avatarUrl={display.avatarUrl}
      badge={display.badge}
      coverUrl={display.coverUrl}
    />
  );
}
