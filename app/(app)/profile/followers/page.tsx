/**
 * 我的粉丝（/profile/followers，D3）——关注我的人，可回关/取关
 * server 读库（RLS 公开读 follows），关注态用 fetchFollowingIds 一次查询判断（防 N+1）
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFollowers, fetchFollowingIds } from "@/lib/queries-social";
import { RelationList } from "@/components/app/shell/relation-list";

export const dynamic = "force-dynamic";

export const metadata = { title: "我的粉丝 | 引力" };

export default async function FollowersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [users, followingIds] = await Promise.all([
    fetchFollowers(supabase, user.id),
    fetchFollowingIds(supabase, user.id),
  ]);

  return (
    <div className="app-content">
      <Link className="category-back" href="/profile">← 返回个人主页</Link>
      <header className="mb-4 flex flex-wrap items-baseline gap-x-3">
        <h1 className="m-0 text-2xl tracking-[-0.5px]">我的粉丝</h1>
        <p className="m-0 text-[13px] text-muted">共 {users.length} 人</p>
      </header>
      <RelationList users={users} initialFollowingIds={followingIds} emptyText="还没有粉丝，把主页分享出去让更多人看到吧。" />
    </div>
  );
}
