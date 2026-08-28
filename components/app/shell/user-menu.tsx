"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Gem, Settings, HelpCircle, LogOut } from "lucide-react";
import { AvatarBox } from "@/components/app/common/avatar-box";

/**
 * 用户下拉菜单：纯头像触发（不显示昵称/邮箱，昵称见个人主页、邮箱见用户设置）
 * 菜单项：个人主页 / 用户设置 / 帮助与反馈 / 退出登录
 * 2026-08-25 SEO（D1 公开只读）：未登录游客（访问 /square /profile 等公开区）显示「登录/注册」入口
 */
export function UserMenu({
  onOpenSettings,
  onOpenHelp,
}: {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState("U");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  /* null = 登录态未确定（避免游客闪现菜单） */
  const [authed, setAuthed] = useState<boolean | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      /* 2a：昵称以 public.users 为权威；S-1：头像读 avatar_url 显示图片 */
      const { data: profile } = await supabase
        .from("users")
        .select("name, avatar_url")
        .eq("id", u.id)
        .maybeSingle();
      const name =
        (profile?.name as string) ||
        (u.user_metadata?.name as string) ||
        u.email?.split("@")[0] ||
        "引力用户";
      setInitial(name.charAt(0).toUpperCase());
      setAvatarUrl((profile?.avatar_url as string) ?? "");
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  /* 游客（未登录）：显示登录/注册入口（公开只读区访问场景，2026-08-25） */
  if (authed === false) {
    return (
      <div className="user-menu guest-user-menu">
        <Link className="guest-user-link" href="/login">登录</Link>
        <Link className="guest-user-link primary" href="/register">注册</Link>
      </div>
    );
  }

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-label="打开用户菜单"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {avatarUrl ? (
          <AvatarBox path={avatarUrl} name={initial} className="user-menu-avatar" />
        ) : (
          <span>{initial}</span>
        )}
      </button>
      {open && (
        <div className="user-menu-panel" role="menu">
          <Link className="user-menu-item" href="/profile" role="menuitem" onClick={() => setOpen(false)}>
            <span><User size={13} /></span>个人主页
          </Link>
          <Link className="user-menu-item" href="/promo" role="menuitem" onClick={() => setOpen(false)}>
            <span><Gem size={13} /></span>订阅计划
          </Link>
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
          >
            <span><Settings size={13} /></span>用户设置
          </button>
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenHelp();
            }}
          >
            <span><HelpCircle size={13} /></span>帮助与反馈
          </button>
          <div className="user-menu-divider" />
          <button
            type="button"
            className="user-menu-item danger"
            role="menuitem"
            disabled={signingOut}
            onClick={handleSignOut}
          >
            <span><LogOut size={13} /></span>{signingOut ? "退出中…" : "退出登录"}
          </button>
        </div>
      )}
    </div>
  );
}
