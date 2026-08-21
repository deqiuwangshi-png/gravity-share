"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ICONS } from "@/lib/icons";

/**
 * 用户下拉菜单：个人主页（跳转）/ 帮助与反馈（面板）/ 退出登录
 * 2026-08-21 瘦身：发布管理、账户安全已迁入个人主页（发现/推广 tab + 设置 tab）
 */
export function UserMenu({ onOpenHelp }: { onOpenHelp: () => void }) {
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
          <Link className="user-menu-item" href="/profile" role="menuitem" onClick={() => setOpen(false)}>
            <span>{ICONS.design}</span>个人主页
          </Link>
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenHelp();
            }}
          >
            <span>{ICONS.help}</span>帮助与反馈
          </button>
          <div className="user-menu-divider" />
          <Link className="user-menu-item danger" href="/login" role="menuitem" onClick={() => setOpen(false)}>
            <span>{ICONS.logout}</span>退出登录
          </Link>
        </div>
      )}
    </div>
  );
}
