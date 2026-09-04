/**
 * 通知抽屉 hook（2026-09-04 自 notification-drawer 抽离——组件职责分层，见 AGENTS.md）
 * - 数据态：items / failed / load / retry（open 时拉一次，关闭时不请求，与原组件行为一致）
 * - 编排：openItem（写库 → 派发 → 刷新 → 导航）/ markAll（写库 → 派发 → 刷新）
 *   ⚠ 顺序不可变：写库 → dispatch → load()。调换会导致红点与抽屉未读数短时不一致。
 * - 事件在 hook 派发（lib 是纯数据层，不放 window.dispatchEvent）
 * - 导航在 hook（useRouter）：组件只做 DOM 与受控绑定 + ESC 关闭（抽屉自身 UI 交互）
 */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NOTIFICATION_UPDATED_EVENT } from "@/lib/events";
import { fetchNotifications } from "@/lib/queries/notifications";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notification-actions";
import type { NotificationDTO } from "@/lib/types";

export function useNotifications(open: boolean, onClose: () => void) {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  const load = useCallback(() => {
    void fetchNotifications(createClient())
      .then(setItems)
      .catch(() => setFailed(true));
  }, []);

  /* 重试（事件处理器内重置状态，避免 effect 内同步 setState） */
  function retry() {
    setFailed(false);
    load();
  }

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  /** 点条目：未读则写库 → 派发 → 刷新，再跳关联内容（016 内容池归一后通知仅指向 square 帖子） */
  async function openItem(item: NotificationDTO) {
    if (!item.read) {
      await markNotificationRead(createClient(), item.id);
      window.dispatchEvent(new Event(NOTIFICATION_UPDATED_EVENT));
      load();
    }
    if (item.targetType && item.itemId) {
      onClose();
      router.push(`/square/${item.itemId}`);
    }
  }

  /** 全部已读（抽屉头部按钮）：写库 → 派发 → 刷新 */
  async function markAll() {
    await markAllNotificationsRead(createClient());
    window.dispatchEvent(new Event(NOTIFICATION_UPDATED_EVENT));
    load();
  }

  return { items, failed, retry, openItem, markAll };
}
