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

/* 2026-09-02 P2-home+P3-壳 批次：shell.css 布局全量 Tailwind 化（255 行 → 原子类）。
 * 保留装饰挂靠类名（styles/app/decor.css 承载）：app-shell（CSS 变量宿主，notification.css 依赖）、
 * app-topbar（毛玻璃 rgba）、global-search（聚焦光晕）、app-logo（logo-mark 30px 覆盖）。
 * 断点 800（侧栏隐藏/main 全宽/顶栏收窄/操作区隐藏）、480（kbd 隐藏）逐像素保留。 */
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

  return <div className="app-shell min-h-svh bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[230px] flex-col border-r border-line bg-raised px-[14px] py-[22px] max-[800px]:hidden">
      <Logo className="app-logo flex items-center gap-[10px] px-[10px] pb-6 pt-[6px] text-[19px] font-extrabold tracking-[-0.5px]" />
      <button type="button" className="mb-6 flex h-10 w-full items-center justify-center rounded-[9px] border-0 bg-primary text-[13px] font-semibold text-on-primary transition-[background-color] duration-[180ms] hover:bg-primary-dark" onClick={() => setPublishOpen(true)}>+ 发布</button>
      <AppNavSection title="导航" items={MAIN_NAV} />
    </aside>
    <main className="ml-[230px] min-h-svh w-[calc(100%-230px)] max-[800px]:ml-0 max-[800px]:w-full">
      <header className="app-topbar sticky top-0 z-10 flex h-[68px] items-center px-8 max-[800px]:px-[15px]">
        <form className="global-search relative flex h-10 max-w-[620px] flex-1 items-center rounded-[10px] border border-line bg-surface transition-[border-color,box-shadow] duration-[180ms] focus-within:border-line-primary max-[800px]:w-full" onSubmit={onSearchSubmit}><span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-soft"><Search size={16} /></span><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索你需要的东西……（回车搜索，/ 快捷聚焦）" aria-label="全局搜索" className="min-w-0 flex-1 border-0 bg-transparent pl-9 text-foreground outline-none placeholder:text-soft" />
          {search && (
            <button
              type="button"
              className="mr-1 grid size-5 cursor-pointer place-items-center rounded-full border-0 bg-hover text-muted transition-colors duration-[180ms] hover:text-foreground"
              aria-label="清除搜索"
              onClick={() => {
                setSearch("");
                router.push("/home");
              }}
            ><X size={13} /></button>
          )}
          <kbd className="mr-[10px] border-0 bg-transparent p-0 text-[11px] text-muted max-[480px]:hidden">/</kbd></form>
        <div className="ml-auto flex items-center gap-3 max-[800px]:hidden">
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
  return <div className="mb-[25px]"><h2 className="m-0 px-[10px] pb-2 text-[11px] font-semibold uppercase tracking-[1px] text-soft">{title}</h2>{items.map(([icon, label, href]) => <Link className={`flex w-full items-center gap-[11px] rounded-[9px] p-[10px] text-sm transition-[background-color,color] duration-[180ms] hover:bg-hover hover:text-foreground ${pathname === href ? "bg-primary-soft font-semibold text-primary-dark" : "text-muted"}`} href={href} key={label}><span className="w-5 text-center text-[15px]">{icon}</span>{label}</Link>)}</div>;
}
