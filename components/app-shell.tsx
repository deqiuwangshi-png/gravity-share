"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { SettingsPanel, type PanelId } from "@/components/settings-panel";
import { UserMenu } from "@/components/user-menu";
import { EXPLORE_NAV, PUBLISH_TYPES } from "@/lib/config";

type NavItem = readonly [string, string, string];

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [publishOpen, setPublishOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [search, setSearch] = useState("");

  return <div className="app-shell">
    <aside className="app-sidebar">
      <Logo className="app-logo" />
      <button type="button" className="sidebar-publish" onClick={() => setPublishOpen(true)}>+ 发布</button>
      <AppNavSection title="探索" items={EXPLORE_NAV} />
    </aside>
    <main className="app-main">
      <header className="app-topbar">
        <form className="global-search" onSubmit={(event) => event.preventDefault()}><span className="app-search-icon">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索你需要的东西……" aria-label="全局搜索" /><kbd>/</kbd></form>
        <div className="topbar-actions">
          <button type="button" className="top-action" aria-label="消息">✉</button>
          <UserMenu onOpenPanel={setActivePanel} />
        </div>
      </header>
      {children}
    </main>
    {publishOpen && <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title" onClick={() => setPublishOpen(false)}><div className="modal-box" onClick={(event) => event.stopPropagation()}><div className="modal-header"><h2 id="publish-title">发布一个好东西</h2><button type="button" onClick={() => setPublishOpen(false)} aria-label="关闭">×</button></div><div className="publish-types">{PUBLISH_TYPES.map(([icon, name]) => <button type="button" key={name}><span>{icon}</span>{name}</button>)}</div></div></div>}
    {activePanel && <SettingsPanel initialTab={activePanel} onClose={() => setActivePanel(null)} />}
  </div>;
}

function AppNavSection({ title, items }: { title: string; items: ReadonlyArray<NavItem> }) {
  const pathname = usePathname();
  return <div className="app-nav-section"><h2>{title}</h2>{items.map(([icon, label, href]) => <Link className={`app-nav-item${pathname === href ? " active" : ""}`} href={href} key={label}><span>{icon}</span>{label}</Link>)}</div>;
}
