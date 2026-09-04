/**
 * 未读通知红点 hook（2026-09-04 自 app-shell 抽离——组件职责分层，见 AGENTS.md）
 * - 只对外暴露「是否有未读」布尔：红点不需要列表数据，避免把通知数据搬进布局壳
 * - 挂载拉一次 + 监听 NOTIFICATION_UPDATED_EVENT（抽屉内单条已读 / 全部已读后派发）
 * - 拉取失败静默：红点不显示，下次事件或重新挂载再试（不打断首屏）
 */
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NOTIFICATION_UPDATED_EVENT } from "@/lib/events";
import { fetchNotifications } from "@/lib/queries/notifications";

export function useUnreadNotifications() {
  const [unread, setUnread] = useState(false);

  const refresh = useCallback(() => {
    void fetchNotifications(createClient())
      .then((list) => setUnread(list.some((n) => !n.read)))
      .catch(() => {
        /* 拉取失败静默：红点不显示，下次事件/挂载再试 */
      });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(NOTIFICATION_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(NOTIFICATION_UPDATED_EVENT, refresh);
  }, [refresh]);

  return unread;
}
