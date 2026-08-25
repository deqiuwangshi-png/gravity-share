/**
 * 他人主页（/profile/[id]，2c）——只读他人资料 + 内容流 + 关注按钮
 * 2026-08-25 SEO（D1 公开只读）：移除登录守卫（游客/爬虫可看），补 generateMetadata + Person JSON-LD；
 * 本人访问自己的 /profile/[uuid] → 重定向 /profile；无效 id → 404
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFollowingCount, fetchFollowerCount } from "@/lib/queries";
import { SITE_URL, buildPerson, jsonLd } from "@/lib/seo";
import ProfileView from "@/components/app/shell/profile-view";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("name, bio")
    .eq("id", id)
    .maybeSingle();
  const name = ((profile?.name as string) ?? "").trim() || "引力用户";
  const bio = (profile?.bio as string) ?? "";
  return {
    title: `${name} 的个人主页`,
    description: bio || `${name} 在引力分享的内容`,
    alternates: { canonical: `/profile/${id}` },
    robots: { index: true, follow: true },
  };
}

export default async function OtherProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  /* 本人访问自己的公开 URL → 跳自己主页（游客 user 为空，跳过） */
  if (user && user.id === id) redirect("/profile");

  const { data: profile } = await supabase
    .from("users")
    .select("name, bio, avatar_url, cover_url, badge")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  const name = ((profile.name as string) ?? "").trim() || "引力用户";
  const bio = (profile.bio as string) ?? "";
  const avatarUrl = (profile.avatar_url as string) ?? "";
  const coverUrl = (profile.cover_url as string) ?? "";
  const badge = ((profile.badge as string) ?? "none") as "none" | "official" | "discoverer";
  const followerCount = await fetchFollowerCount(supabase, id);
  const followingCount = await fetchFollowingCount(supabase, id);

  return (
    <>
      {/* Person 结构化数据（个人品牌区：搜昵称出主页 + 富结果） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(buildPerson({ name, description: bio || undefined, url: `${SITE_URL}/profile/${id}` })),
        }}
      />
      <ProfileView
        name={name}
        bio={bio}
        userId={id}
        isSelf={false}
        followerCount={followerCount}
        followingCount={followingCount}
        avatarUrl={avatarUrl}
        badge={badge}
        coverUrl={coverUrl}
      />
    </>
  );
}
