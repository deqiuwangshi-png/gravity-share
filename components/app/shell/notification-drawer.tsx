"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_UPDATED_EVENT,
} from "@/lib/queries";
import type { NotificationDTO } from "@/lib/types";

/**
 * 顶栏消息通知（2c 起读库）：
 * - NotificationTrigger：铃铛图标按钮（纯图标 + 未读红点，无文字）
 * - NotificationDrawer：遮罩 + 预览抽屉，fixed 限定在中间内容栏内（left: 侧边栏宽），
 *   从右侧向左滑入；再点铃铛 / 点遮罩 / 按 ESC 收回
 * 点条目：自动已读 + 跳转关联内容（discovery / square）；头部「全部已读」
 */

export function NotificationTrigger({
  open,
  unread,
  onToggle,
}: {
  open: boolean;
  unread: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="notify-trigger"
      aria-label="消息通知"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onToggle}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unread && <span className="notify-dot" aria-hidden="true" />}
    </button>
  );
}

export function NotificationDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const router = useRouter();

  const load = useCallback(() => {
    void fetchNotifications(createClient()).then(setItems);
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function onOpenItem(item: NotificationDTO) {
    if (!item.read) {
      await markNotificationRead(createClient(), item.id);
      window.dispatchEvent(new Event(NOTIFICATION_UPDATED_EVENT));
      load();
    }
    if (item.targetType && item.itemId) {
      onClose();
      router.push(item.targetType === "discovery" ? `/discover/${item.itemId}` : `/square/${item.itemId}`);
    }
  }

  async function onMarkAll() {
    await markAllNotificationsRead(createClient());
    window.dispatchEvent(new Event(NOTIFICATION_UPDATED_EVENT));
    load();
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className={`notify-layer${open ? " open" : ""}`}>
      <div className="notify-overlay" onClick={onClose} aria-hidden="true" />
      <aside
        className="notify-drawer"
        id="notify-drawer"
        aria-label="通知预览"
        aria-hidden={!open}
      >
        <header className="notify-head">
          <h2>通知</h2>
          <div className="notify-head-actions">
            {unreadCount > 0 && <span className="notify-unread-count">{unreadCount} 条未读</span>}
            {unreadCount > 0 && (
              <button type="button" className="notify-mark-all" onClick={() => void onMarkAll()}>全部已读</button>
            )}
          </div>
        </header>
        <div className="notify-list">
          {items.length === 0 ? (
            <p className="notify-empty">暂无通知</p>
          ) : (
            items.map((item) => (
              <button
                type="button"
                className={`notify-item${item.read ? "" : " unread"}`}
                key={item.id}
                onClick={() => void onOpenItem(item)}
              >
                <div className="notify-item-head">
                  <h3>{item.title}</h3>
                  <time>{item.time}</time>
                </div>
                <p>{item.content}</p>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
