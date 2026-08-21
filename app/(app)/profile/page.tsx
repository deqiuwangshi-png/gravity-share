/**
 * 个人主页（/profile）——server 端读 Supabase 会话与用户资料
 * 未登录 → /login（proxy 已拦截，双保险）；用户资料传入 ProfileView（client）
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFollowingCount, fetchFollowerCount } from "@/lib/queries";
import ProfileView from "@/components/app/shell/profile-view";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  /* 读 public.users 资料（RLS：auth.uid() = id，仅自己） */
  const { data: profile } = await supabase
    .from("users")
    .select("name, bio, avatar_url, cover_url, points")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    (profile?.name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "引力用户";
  const bio = (profile?.bio as string) ?? "";
  const points = (profile?.points as number) ?? 0;
  const avatarUrl = (profile?.avatar_url as string) ?? "";
  const coverUrl = (profile?.cover_url as string) ?? "";
  const followerCount = await fetchFollowerCount(supabase, user.id);
  const followingCount = await fetchFollowingCount(supabase, user.id);

  return (
    <ProfileView
      name={name}
      bio={bio}
      points={points}
      userId={user.id}
      followerCount={followerCount}
      followingCount={followingCount}
      avatarUrl={avatarUrl}
      coverUrl={coverUrl}
    />
  );
}
