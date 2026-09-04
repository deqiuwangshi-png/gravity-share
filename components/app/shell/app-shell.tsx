"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/common/logo";
import { SettingsPanel, type PanelId } from "./settings-panel";
import { UserMenu } from "./user-menu";
import { GlobalSearch } from "./global-search";
import { NotificationDrawer, NotificationTrigger } from "./notification-drawer";
import { MAIN_NAV } from "@/lib/config";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";

/* P0-1 性能优化（2026-08-31）：发布弹窗动态导入——Tiptap 编辑器全家从 app 首屏主 bundle 拆出，
 * 仅在点「+ 发布」时按需加载，导航/首屏不再解析这段大 JS */
const PublishModal = dynamic(() => import("./publish-modal"), { ssr: false, loading: () => null });

type NavItem = readonly [string, string, string];

/* 2026-09-02 P2-home+P3-壳 批次：shell.css 布局全量 Tailwind 化（255 行 → 原子类）。
 * 保留装饰挂靠类名（styles/app/decor.css 承载）：app-shell（CSS 变量宿主，通知抽屉原子类 var() 引用，
 * notification.css 已于同日通知批次迁删）、app-topbar（毛玻璃 rgba）、global-search（聚焦光晕）。
 * 断点 800（侧栏隐藏/main 全宽/顶栏收窄/操作区隐藏）、480（kbd 隐藏）逐像素保留。
 *
 * 2026-09-04 职责收敛（见 deliverables/app-shell-srp-audit-2026-09-04.md）：
 * 本文件只做「布局结构 + Overlay 开/关编排 + 回调下传」。
 * 数据态（未读通知）下沉 hooks/use-unread-notifications；
 * 搜索功能下沉 components/app/shell/global-search（状态机在 hooks/use-global-search）。 */
export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [publishOpen, setPublishOpen] = useState(false);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  /* 未读红点：数据由 hook 持有（挂载拉一次 + NOTIFICATION_UPDATED_EVENT 刷新），壳只消费布尔 */
  const unread = useUnreadNotifications();

  return <div className="app-shell min-h-svh bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[230px] flex-col border-r border-line bg-raised px-[14px] py-[22px] max-[800px]:hidden">
      <Logo size={30} className="flex items-center gap-[10px] px-[10px] pb-6 pt-[6px] text-[19px] font-extrabold tracking-[-0.5px]" />
      <button type="button" className="mb-6 flex h-10 w-full items-center justify-center rounded-[9px] border-0 bg-primary text-[13px] font-semibold text-on-primary transition-[background-color] duration-[180ms] hover:bg-primary-dark" onClick={() => setPublishOpen(true)}>+ 发布</button>
      <AppNavSection items={MAIN_NAV} />
    </aside>
    <main className="ml-[230px] min-h-svh w-[calc(100%-230px)] max-[800px]:ml-0 max-[800px]:w-full">
      <header className="app-topbar sticky top-0 z-10 flex h-[68px] items-center px-8 max-[800px]:px-[15px]">
        <GlobalSearch />
        <div className="ml-auto flex items-center gap-3 max-[800px]:hidden">
          <NotificationTrigger
            open={notifyOpen}
            unread={unread}
            onToggle={() => setNotifyOpen(!notifyOpen)}
          />
          <UserMenu onOpenSettings={() => setPanel("settings")} />
        </div>
      </header>
      <NotificationDrawer open={notifyOpen} onClose={() => setNotifyOpen(false)} />
      {children}
    </main>
    {publishOpen && <PublishModal onClose={() => setPublishOpen(false)} />}
    {panel && <SettingsPanel initialTab={panel} onClose={() => setPanel(null)} />}
  </div>;
}

function AppNavSection({ items }: { items: ReadonlyArray<NavItem> }) {
  const pathname = usePathname();
  return <div className="mb-[25px]">
    {items.map(([icon, label, href]) => <Link className={`flex w-full items-center gap-[11px] rounded-[9px] p-[10px] text-sm transition-[background-color,color] duration-[180ms] hover:bg-hover hover:text-foreground ${pathname === href ? "bg-primary-soft font-semibold text-primary-dark" : "text-muted"}`} href={href} key={label}><span className="w-5 text-center text-[15px]">{icon}</span>{label}</Link>)}</div>;
}
