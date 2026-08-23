/**
 * /discover/[id] 退役（2026-08-23 内容池归一）：重定向到 /square/[id]
 * discoveries 数据已并入 square_posts（迁移 016，id 复用），旧链接不 404
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DiscoverDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/square/${id}`);
}
