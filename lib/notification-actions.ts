/**
 * 通知写动作层（2026-09-04 自 lib/queries/notifications.ts 迁出——查询层只留读，写动作收口）：
 * - markNotificationRead：单条已读（点条目时）
 * - markAllNotificationsRead：全部已读（抽屉头部按钮）
 * RLS 承担归属校验；markAll 需先 getUser 取 uid 再 eq user_id，搬迁时语义原样保留。
 *
 * 事件派发（NOTIFICATION_UPDATED_EVENT）与数据刷新在 hooks/use-notifications——本层只做单次写、无副作用。
 * 写失败静默：抽屉与红点的最终状态由 hook 的 load() 从库拉回真实值自愈。
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const NOTIFICATIONS = "notifications";

/** 单条已读（点条目时） */
export async function markNotificationRead(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from(NOTIFICATIONS).update({ read: true }).eq("id", id);
}

/** 全部已读（抽屉头部按钮）。未登录直接返回，避免无 uid 的 update */
export async function markAllNotificationsRead(supabase: SupabaseClient): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from(NOTIFICATIONS).update({ read: true }).eq("user_id", user.id);
}
