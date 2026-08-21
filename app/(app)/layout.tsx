import "@/styles/app/shell.css";
import "@/styles/app/discovery.css";
import "@/styles/app/detail.css";
import "@/styles/app/detail-comments.css";
import "@/styles/app/list.css";
import "@/styles/app/modal.css";
import "@/styles/app/announcement.css";
import "@/styles/app/user-menu.css";
import "@/styles/app/settings.css";
import "@/styles/app/feed.css";
import "@/styles/app/square.css";
import AppShell from "@/components/app/shell/app-shell";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
