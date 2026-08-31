/**
 * 他人主页（/profile/[id]，2c）——只读他人资料 + 内容流 + 关注按钮
 * 2026-08-25 SEO（D1 公开只读）：移除登录守卫（游客/爬虫可看），补 generateMetadata + Person JSON-LD；
 * 本人访问自己的 /profile/[uuid] → 重定向 /profile；无效 id → 404
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchFollowingCount, fetchFollowerCount } from "@/lib/queries-social";
import { fetchSquarePostsByAuthor } from "@/lib/queries-posts";
import { SITE_URL, buildPerson, jsonLd } from "@/lib/seo";
import { publicImageUrl } from "@/lib/storage";
import ProfileView from "@/components/app/shell/profile-view";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

/** 同一次请求内 generateMetadata 与页面主体共享同一查询（React cache 以 id 为 key） */
const getProfile = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("name, bio, avatar_url, cover_url, badge")
    .eq("id", id)
    .maybeSingle();
  return data as { name: string | null; bio: string | null; avatar_url: string | null; cover_url: string | null; badge: string | null } | null;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  const name = ((profile?.name as string) ?? "").trim() || "引力用户";
  const bio = (profile?.bio as string) ?? "";
  const avatarUrl = (profile?.avatar_url as string) ?? "";
  /* P1-4：头像作 og:image（storage path 拼接；OAuth 外链原样） */
  const ogImage = avatarUrl ? publicImageUrl("avatar", avatarUrl) : undefined;
  return {
    title: `${name} 的个人主页`,
    description: bio || `${name} 在引力分享的内容`,
    alternates: { canonical: `/profile/${id}` },
    robots: { index: true, follow: true },
    /* P1-4：个人品牌页补 OG（分享卡片含头像缩略图） */
    openGraph: {
      title: `${name} 的个人主页`,
      description: bio || `${name} 在引力分享的内容`,
      url: `${SITE_URL}/profile/${id}`,
      type: "profile",
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
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

  /* P0-8 并行化：资料 / 发布内容 / 粉丝 / 关注四个查询同时发（posts 服务端预取 → SSR 首帧含作者内容流） */
  const [profile, myPosts, followerCount, followingCount] = await Promise.all([
    getProfile(id),
    fetchSquarePostsByAuthor(supabase, id),
    fetchFollowerCount(supabase, id),
    fetchFollowingCount(supabase, id),
  ]);
  if (!profile) notFound();

  const name = ((profile.name as string) ?? "").trim() || "引力用户";
  const bio = (profile.bio as string) ?? "";
  const avatarUrl = (profile.avatar_url as string) ?? "";
  const coverUrl = (profile.cover_url as string) ?? "";
  const badge = ((profile.badge as string) ?? "none") as "none" | "official" | "discoverer";

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
        initialPosts={myPosts}
      />
    </>
  );
}
