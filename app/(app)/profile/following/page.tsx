/**
 * 我的关注（/profile/following，D3）——我关注的用户列表，可管理（关注/取关）
 * server 读库（RLS 公开读 follows），交互在 RelationList（client）
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchFollowing } from "@/lib/queries/social";
import { RelationList } from "@/components/app/shell/relation-list";

export const dynamic = "force-dynamic";

export const metadata = { title: "我的关注 | 引力" };

export default async function FollowingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const users = await fetchFollowing(supabase, user.id);
  /* 关注页：列表即我关注的人，初始全部为已关注态 */
  const followingIds = users.map((u) => u.id);

  return (
    <div className="app-content">
      <Link className="mb-4 inline-block text-[13px] text-muted transition-[color] duration-[180ms] hover:text-primary" href="/profile">← 返回个人主页</Link>
      <header className="mb-4 flex flex-wrap items-baseline gap-x-3">
        <h1 className="m-0 text-2xl tracking-[-0.5px]">我的关注</h1>
        <p className="m-0 text-[13px] text-muted">共 {users.length} 人</p>
      </header>
      <RelationList users={users} initialFollowingIds={followingIds} emptyText="还没有关注任何人，去他人主页点「关注」吧。" />
    </div>
  );
}
