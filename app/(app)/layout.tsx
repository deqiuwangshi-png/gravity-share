import "@/styles/app/rich-content.css";
/* decor.css 为装饰/覆盖层（变量宿主 + 非令牌 rgba + 伪元素收容），须最后加载以覆盖同层规则。
 * 2026-09-03 P1：modal.css 已删——四个弹窗壳（publish/profile-edit/settings/account-action）
 * 换 Radix Dialog 组合（components/ui/dialog），.app-modal 遮罩骨架由 Dialog 默认遮罩类取代 */
import "@/styles/app/decor.css";
import AppShell from "@/components/app/shell/app-shell";
import { ToastProvider } from "@/components/app/common/toast";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
