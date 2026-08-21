"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/common/logo";
import { SettingsPanel, type PanelId } from "./settings-panel";
import { UserMenu } from "./user-menu";
import { NotificationDrawer, NotificationTrigger } from "./notification-drawer";
import PublishModal from "./publish-modal";
import { MAIN_NAV } from "@/lib/config";
import { ICONS } from "@/lib/icons";
import { createClient } from "@/lib/supabase/client";
import { fetchNotifications, NOTIFICATION_UPDATED_EVENT } from "@/lib/queries";

type NavItem = readonly [string, string, string];

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [publishOpen, setPublishOpen] = useState(false);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [search, setSearch] = useState("");
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  /* 未读红点：查库（2c）；抽屉内已读后监听事件刷新 */
  useEffect(() => {
    const refresh = () => {
      void fetchNotifications(createClient()).then((list) => setHasUnread(list.some((n) => !n.read)));
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
        <form className="global-search" onSubmit={(event) => event.preventDefault()}><span className="app-search-icon">{ICONS.search}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索你需要的东西……" aria-label="全局搜索" /><kbd>/</kbd></form>
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
