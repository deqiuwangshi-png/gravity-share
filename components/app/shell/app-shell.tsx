"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/common/logo";
import { SettingsPanel, type PanelId } from "./settings-panel";
import { UserMenu } from "./user-menu";
import { NotificationDrawer, NotificationTrigger } from "./notification-drawer";
import { MAIN_NAV } from "@/lib/config";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NOTIFICATION_UPDATED_EVENT } from "@/lib/events";
import { fetchNotifications } from "@/lib/queries-notifications";

/* P0-1 性能优化（2026-08-31）：发布弹窗动态导入——Tiptap 编辑器全家从 app 首屏主 bundle 拆出，
 * 仅在点「+ 发布」时按需加载，导航/首屏不再解析这段大 JS */
const PublishModal = dynamic(() => import("./publish-modal"), { ssr: false, loading: () => null });

type NavItem = readonly [string, string, string];

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [publishOpen, setPublishOpen] = useState(false);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [search, setSearch] = useState("");
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef<HTMLInputElement>(null);

  /** 最小搜索：回车跳 /home?q=…，由 SquareFeed 用 useSearchParams 过滤（零新依赖，2026-08-27 方案A 广场合并首页后目标改为 /home） */
  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = search.trim();
    router.push(q ? `/home?q=${encodeURIComponent(q)}` : "/home");
  }

  /* 搜索词回显（2026-08-31）：路由变化时把 URL ?q= 同步进输入框——从 /home?q=xx 进入或搜索后离开再回来，搜索态不丢失。
   * 实现：React 官方「render 期状态调整」模式（you-might-not-need-an-effect），替代 effect 内同步 setState——
   * 规避 react-hooks/set-state-in-effect 级联渲染告警；SSR 首帧无 window（typeof 防护），
   * pathname 未变化时不触发调整（prevPath 守卫，不会无限重渲染） */
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath && typeof window !== "undefined") {
    setPrevPath(pathname);
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    setSearch(q);
  }

  /* 全局 / 快捷键（2026-08-31 兑现 kbd 提示）：焦点不在输入类元素时按 / → 聚焦搜索框（阻止浏览器找字默认行为） */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable)) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* 未读红点：查库（2c）；抽屉内已读后监听事件刷新 */
  useEffect(() => {
    const refresh = () => {
      void fetchNotifications(createClient())
        .then((list) => setHasUnread(list.some((n) => !n.read)))
        .catch(() => { /* 拉取失败静默：红点不显示，下次事件/挂载再试 */ });
    };
    refresh();
    window.addEventListener(NOTIFICATION_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(NOTIFICATION_UPDATED_EVENT, refresh);
  }, []);

  return <div className="app-shell">
    <aside className="app-sidebar">
      <Logo className="app-logo" />
      <button type="button" className="sidebar-publish" onClick={() => setPublishOpen(true)}>+ 发布</button>
      <AppNavSection title="导航" items={MAIN_NAV} />
    </aside>
    <main className="app-main">
      <header className="app-topbar">
        <form className="global-search" onSubmit={onSearchSubmit}><span className="app-search-icon"><Search size={16} /></span><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索你需要的东西……（回车搜索，/ 快捷聚焦）" aria-label="全局搜索" />
          {search && (
            <button
              type="button"
              className="global-search-clear"
              aria-label="清除搜索"
              onClick={() => {
                setSearch("");
                router.push("/home");
              }}
            ><X size={13} /></button>
          )}
          <kbd>/</kbd></form>
        <div className="topbar-actions">
          <NotificationTrigger
            open={notifyOpen}
            unread={hasUnread}
            onToggle={() => setNotifyOpen(!notifyOpen)}
          />
          <UserMenu onOpenSettings={() => setPanel("settings")} onOpenHelp={() => setPanel("help")} />
        </div>
      </header>
      <NotificationDrawer open={notifyOpen} onClose={() => setNotifyOpen(false)} />
      {children}
    </main>
    {publishOpen && <PublishModal onClose={() => setPublishOpen(false)} />}
    {panel && <SettingsPanel initialTab={panel} onClose={() => setPanel(null)} />}
  </div>;
}

function AppNavSection({ title, items }: { title: string; items: ReadonlyArray<NavItem> }) {
  const pathname = usePathname();
  return <div className="app-nav-section"><h2>{title}</h2>{items.map(([icon, label, href]) => <Link className={`app-nav-item${pathname === href ? " active" : ""}`} href={href} key={label}><span>{icon}</span>{label}</Link>)}</div>;
}
