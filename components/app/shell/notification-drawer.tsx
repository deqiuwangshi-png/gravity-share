"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadError } from "@/components/app/common/load-error";
import { createClient } from "@/lib/supabase/client";
import { NOTIFICATION_UPDATED_EVENT } from "@/lib/events";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/queries-notifications";
import type { NotificationDTO } from "@/lib/types";

/**
 * 顶栏消息通知（2c 起读库）：
 * - NotificationTrigger：铃铛图标按钮（纯图标 + 未读红点，无文字）
 * - NotificationDrawer：遮罩 + 预览抽屉，fixed 限定在中间内容栏内（left: 侧边栏宽，
 *   --app-sidebar-w 变量，≤800 收 0 抽屉全宽），从右侧向左滑入；再点铃铛 / 点遮罩 / 按 ESC 收回
 * 点条目：自动已读 + 跳转关联内容（square）；头部「全部已读」
 * 2026-09-02 CSS→Tailwind 迁移：notification.css 已删，抽屉定位 left/top 仍引用
 * decor.css ① 壳变量宿主（--app-sidebar-w/--app-topbar-h），遮罩背景/面板阴影见 decor ⑧
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
      className={`relative grid h-9 w-9 place-items-center rounded-lg text-muted transition-[background-color,color] duration-[180ms] hover:bg-surface hover:text-foreground${open ? " bg-primary-soft text-primary" : ""}`}
      aria-label="消息通知"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onToggle}
    >
      <svg
        className="h-[19px] w-[19px]"
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
      {unread && <span className="absolute right-[7px] top-[7px] h-2 w-2 rounded-full bg-error" aria-hidden="true" />}
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
      /* 016 内容池归一后通知仅指向 square 帖子 */
      router.push(`/square/${item.itemId}`);
    }
  }

  async function onMarkAll() {
    await markAllNotificationsRead(createClient());
    window.dispatchEvent(new Event(NOTIFICATION_UPDATED_EVENT));
    load();
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    /* 常驻挂载，open 条件类驱动进出（pointer-events 防闭合误点；抽屉/遮罩动画与 CSS 状态机等价） */
    <div className={`fixed inset-y-0 right-0 left-[var(--app-sidebar-w)] z-[15] overflow-hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        className={`notify-overlay absolute inset-x-0 bottom-0 top-[var(--app-topbar-h)] transition-opacity duration-[240ms]${open ? " opacity-100" : " opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`notify-drawer absolute bottom-0 right-0 top-[var(--app-topbar-h)] flex w-[380px] flex-col border-l border-line bg-surface transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0.35,1)]${open ? " translate-x-0" : " translate-x-full"}`}
        id="notify-drawer"
        aria-label="通知预览"
        aria-hidden={!open}
      >
        <header className="flex items-baseline justify-between gap-3 border-b border-line p-[22px_24px_14px]">
          <h2 className="text-base font-semibold tracking-[-0.3px]">通知</h2>
          <div className="flex items-baseline gap-3">
            {unreadCount > 0 && <span className="text-[12px] text-soft">{unreadCount} 条未读</span>}
            {unreadCount > 0 && (
              <button type="button" className="cursor-pointer p-0 text-[12px] font-medium text-primary [font:inherit]" onClick={() => void onMarkAll()}>全部已读</button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-[8px_0_24px]">
          {failed ? (
            <LoadError onRetry={retry} />
          ) : items.length === 0 ? (
            <p className="p-[64px_24px] text-center text-[13px] text-soft">暂无通知</p>
          ) : (
            items.map((item) => (
              <button
                type="button"
                className="relative block w-full cursor-pointer border-b border-line p-[14px_24px_14px_30px] text-left text-inherit transition-[background-color] duration-[180ms] hover:bg-hover last:border-b-0 [font:inherit]"
                key={item.id}
                onClick={() => void onOpenItem(item)}
              >
                {/* 未读左侧圆点（原 .unread::before 伪元素，Tailwind 无对应 → 条件真实 span） */}
                {!item.read && <span className="absolute left-[14px] top-[22px] h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />}
                <div className="flex items-baseline justify-between gap-2.5">
                  <h3 className={`text-[13px]${item.read ? " font-normal" : " font-semibold"}`}>{item.title}</h3>
                  <time className="shrink-0 text-[11px] text-soft">{item.time}</time>
                </div>
                <p className="mt-[5px] text-[12px] leading-[1.6] text-muted">{item.content}</p>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
