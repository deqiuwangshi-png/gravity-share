/**
 * 他人主页（/profile/[id]，2c）——只读他人资料 + 内容流 + 关注按钮
 * 自己访问自己的 /profile/[uuid] → 重定向 /profile；无效 id → 404
 */
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFollowingCount, fetchFollowerCount } from "@/lib/queries";
import ProfileView from "@/components/app/shell/profile-view";

export const dynamic = "force-dynamic";

export default async function OtherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.id === id) redirect("/profile");

  const { data: profile } = await supabase
    .from("users")
    .select("name, bio, avatar_url, cover_url")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  const name = (profile.name as string) || "引力用户";
  const bio = (profile.bio as string) ?? "";
  const points = 0; /* BUG-8：积分列已收口，他人主页不展示 */
  const avatarUrl = (profile.avatar_url as string) ?? "";
  const coverUrl = (profile.cover_url as string) ?? "";
  const followerCount = await fetchFollowerCount(supabase, id);
  const followingCount = await fetchFollowingCount(supabase, id);

  return (
    <ProfileView
      name={name}
      bio={bio}
      points={points}
      userId={id}
      isSelf={false}
      followerCount={followerCount}
      followingCount={followingCount}
      avatarUrl={avatarUrl}
      coverUrl={coverUrl}
    />
  );
}
