import "@/styles/app/shell.css";
import "@/styles/app/list.css";
import "@/styles/app/modal.css";
import "@/styles/app/announcement.css";
import "@/styles/app/user-menu.css";
import "@/styles/app/comment-menu.css";
import "@/styles/app/notification.css";
import "@/styles/app/settings.css";
import "@/styles/app/settings-delete.css";
import "@/styles/app/settings-devices.css";
import "@/styles/app/verify.css";
import "@/styles/app/feed.css";
import "@/styles/app/home.css";
import "@/styles/app/square.css";
import "@/styles/app/square-detail.css";
import "@/styles/app/square-comments.css";
import "@/styles/app/profile.css";
import "@/styles/app/profile-posts.css";
import "@/styles/app/relation.css";
import "@/styles/app/publish-form.css";
import "@/styles/app/toast.css";
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
