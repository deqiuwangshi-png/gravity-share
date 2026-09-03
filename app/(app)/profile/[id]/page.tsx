/**
 * 他人主页（/profile/[id]，2c）——只读他人资料 + 内容流 + 关注按钮
 * 2026-08-25 SEO（D1 公开只读）：移除登录守卫（游客/爬虫可看），补 generateMetadata + Person JSON-LD；
 * 本人访问自己的 /profile/[uuid] → 重定向 /profile；无效 id → 404
 * 2026-09-03：职责拆分（同 square/[id] 样板）——数据加载迁 lib/profile-detail.ts（loadProfileDetail），
 * metadata/Person/展示派生迁 lib/seo.ts（buildProfileSeo，一次派生），本页回归纯编排
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getProfile, loadProfileDetail } from "@/lib/profile-detail";
import { buildProfileSeo, jsonLd } from "@/lib/seo";
import ProfileView from "@/components/app/shell/profile-view";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  /* getProfile（cache 工厂）：主体 loadProfileDetail 复用同一次查询 */
  const profile = await getProfile(id);
  return buildProfileSeo(profile, id).metadata;
}

export default async function OtherProfilePage({ params }: PageProps) {
  const { id } = await params;
  const detail = await loadProfileDetail(id);
  if (!detail) notFound();
  /* 本人访问自己的公开 URL → 跳自己主页（游客 myId 为空跳过；users 行缺失也 redirect，页面自身有兜底） */
  if (detail.profile === null) redirect("/profile");

  /* buildProfileSeo 复用 generateMetadata 的同源派生（display 五字段 + Person JSON-LD，派生纯函数廉价） */
  const { display, person } = buildProfileSeo(detail.profile, id);
  return (
    <>
      {/* Person 结构化数据（个人品牌区：搜昵称出主页 + 富结果） */}
      {person && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(person) }}
        />
      )}
      <ProfileView
        name={display.name}
        bio={display.bio}
        userId={id}
        isSelf={false}
        followerCount={detail.followerCount}
        followingCount={detail.followingCount}
        avatarUrl={display.avatarUrl}
        badge={display.badge}
        coverUrl={display.coverUrl}
        initialPosts={detail.myPosts}
      />
    </>
  );
}
