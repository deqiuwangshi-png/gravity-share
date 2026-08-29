/**
 * 查询层 · 通知域（S3 拆分 2026-08-29，自 lib/queries.ts 搬移，零逻辑改动）
 * 我的通知（RLS 本人）+ 已读操作；通知由数据库触发器生成
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationDTO } from "@/lib/types";
import { formatRelativeTime } from "@/lib/text";

const NOTIFICATIONS = "notifications";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  content: string;
  read: boolean;
  target_type: string | null;
  item_id: string | null;
  created_at: string;
  actor: { id: string; name: string } | null;
};

function toNotificationDTO(row: NotificationRow): NotificationDTO {
  return {
    id: row.id,
    type: row.type,
    actorName: row.actor?.name ?? "引力用户",
    title: row.title,
    content: row.content,
    time: formatRelativeTime(row.created_at),
    read: row.read,
    targetType: (row.target_type as "square" | null) ?? undefined,
    itemId: row.item_id ?? undefined,
  };
}

/** 我的通知（RLS 本人，时间倒序，最多 20） */
export async function fetchNotifications(supabase: SupabaseClient): Promise<NotificationDTO[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  /* 嵌入 users 表（actor 昵称），通过 notifications 的 actor_id 外键；
   * 注意 PostgREST 语法：目标表名是 users 不是 notifications */
  const { data } = await supabase
    .from(NOTIFICATIONS)
    .select("*, actor:users!notifications_actor_id_fkey(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as NotificationRow[] | null)?.map(toNotificationDTO) ?? [];
}

/** 单条已读（点条目时） */
export async function markNotificationRead(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from(NOTIFICATIONS).update({ read: true }).eq("id", id);
}

/** 全部已读（抽屉头部按钮） */
export async function markAllNotificationsRead(supabase: SupabaseClient): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from(NOTIFICATIONS).update({ read: true }).eq("user_id", user.id);
}
