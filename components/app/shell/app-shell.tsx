"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/common/logo";
import { SettingsPanel, type PanelId } from "./settings-panel";
import { UserMenu } from "./user-menu";
import PublishModal from "./publish-modal";
import { MAIN_NAV } from "@/lib/config";
import { ICONS } from "@/lib/icons";

type NavItem = readonly [string, string, string];

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [publishOpen, setPublishOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [search, setSearch] = useState("");

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
          <button type="button" className="top-action" aria-label="消息">{ICONS.message}</button>
          <UserMenu onOpenPanel={setActivePanel} />
        </div>
      </header>
      {children}
    </main>
    {publishOpen && <PublishModal onClose={() => setPublishOpen(false)} />}
    {activePanel && <SettingsPanel initialTab={activePanel} onClose={() => setActivePanel(null)} />}
  </div>;
}

function AppNavSection({ title, items }: { title: string; items: ReadonlyArray<NavItem> }) {
  const pathname = usePathname();
  return <div className="app-nav-section"><h2>{title}</h2>{items.map(([icon, label, href]) => <Link className={`app-nav-item${pathname === href ? " active" : ""}`} href={href} key={label}><span>{icon}</span>{label}</Link>)}</div>;
}
