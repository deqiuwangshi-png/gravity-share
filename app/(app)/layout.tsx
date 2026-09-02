import "@/styles/app/modal.css";
import "@/styles/app/announcement.css";
import "@/styles/app/user-menu.css";
import "@/styles/app/comment-menu.css";
import "@/styles/app/notification.css";
import "@/styles/app/feed.css";
import "@/styles/app/publish-form.css";
import "@/styles/app/rich-editor.css";
import "@/styles/app/rich-content.css";
import "@/styles/app/gallery.css";
import "@/styles/app/promo.css";
import "@/styles/app/boost.css";
import "@/styles/app/ad.css";
import "@/styles/app/toast.css";
/* decor.css 为装饰/覆盖层（变量宿主 + 非令牌 rgba + 伪元素收容），须最后加载以覆盖 modal.css 同级规则
 * （.settings-overlay 浅色遮罩覆盖 .app-modal 深色；.profile-edit-overlay grid 居中覆盖 .app-modal flex） */
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
