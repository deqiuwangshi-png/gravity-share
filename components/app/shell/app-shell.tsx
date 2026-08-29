"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/common/logo";
import { SettingsPanel, type PanelId } from "./settings-panel";
import { UserMenu } from "./user-menu";
import { NotificationDrawer, NotificationTrigger } from "./notification-drawer";
import PublishModal from "./publish-modal";
import { MAIN_NAV } from "@/lib/config";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NOTIFICATION_UPDATED_EVENT } from "@/lib/events";
import { fetchNotifications } from "@/lib/queries-notifications";

type NavItem = readonly [string, string, string];

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [publishOpen, setPublishOpen] = useState(false);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [search, setSearch] = useState("");
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const router = useRouter();

  /** 最小搜索：回车跳 /home?q=…，由 SquareFeed 用 useSearchParams 过滤（零新依赖，2026-08-27 方案A 广场合并首页后目标改为 /home） */
  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = search.trim();
    router.push(q ? `/home?q=${encodeURIComponent(q)}` : "/home");
  }

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
        <form className="global-search" onSubmit={onSearchSubmit}><span className="app-search-icon"><Search size={16} /></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索你需要的东西……（回车搜索）" aria-label="全局搜索" /><kbd>/</kbd></form>
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
