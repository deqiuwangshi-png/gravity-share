"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PanelId } from "./settings-panel";
import { ICONS } from "@/lib/icons";

const MENU_ITEMS = [
  [ICONS.design, "个人主页", "profile"],
  [ICONS.dev, "发布管理", "publishes"],
  [ICONS.service, "账户安全", "security"],
  [ICONS.help, "帮助与反馈", "help"],
] as const satisfies ReadonlyArray<readonly [string, string, PanelId]>;

export { type PanelId };

/** 用户下拉菜单：点击触发、外点/Esc/选择后关闭；菜单项通过回调打开对应弹窗 */
export function UserMenu({ onOpenPanel }: { onOpenPanel: (panel: PanelId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>U</span><strong>我的账户</strong>
      </button>
      {open && (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-head">
            <span>U</span>
            <div><strong>我的账户</strong><small>普通用户</small></div>
          </div>
          {MENU_ITEMS.map(([icon, label, panel]) => (
            <button
              type="button"
              className="user-menu-item"
              key={label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenPanel(panel);
              }}
            >
              <span>{icon}</span>{label}
            </button>
          ))}
          <div className="user-menu-divider" />
          <Link className="user-menu-item danger" href="/login" role="menuitem" onClick={() => setOpen(false)}>
            <span>{ICONS.logout}</span>退出登录
          </Link>
        </div>
      )}
    </div>
  );
}
