"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, Settings, HelpCircle, LogOut } from "lucide-react";
import { AvatarBox } from "@/components/app/common/avatar-box";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * 用户下拉菜单：纯头像触发（不显示昵称/邮箱，昵称见个人主页、邮箱见用户设置）
 * 菜单项：个人主页 / 用户设置 / 帮助与反馈 / 退出登录
 * 2026-08-25 SEO（D1 公开只读）：未登录游客（访问 /square /profile 等公开区）显示「登录/注册」入口
 * 2026-09-02：user-menu.css 全量 Tailwind 化（129 行 → 原子类）；入场动画 keyframes 收 decor.css ⑨，
 *   .user-menu-trigger strong 为死规则（纯头像菜单无昵称）删除不迁移
 * 2026-09-03 P2：改接 shadcn DropdownMenu（Radix）——删自研 absolute 定位 + document click/Esc 监听；
 *   side=bottom align=end sideOffset=10 等价原 right-0 top-[calc(100%+10px)]（Portal 挂 body 后
 *   视口避让/键盘导航/互斥关闭由 Radix 接管）；入场动画走 Content data-[state=open] 播 decor.css ⑨
 *   user-menu-in（原挂载即播，等价）；「个人主页」Item asChild + Link；设置/帮助/退出走 onSelect
 *   （select 即关菜单，无需手动 setOpen）；退出 onSelect preventDefault 保持菜单开着显示「退出中…」
 *   直至跳转 /login（1:1 原行为）
 */
export function UserMenu({
  onOpenSettings,
  onOpenHelp,
}: {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}) {
  const [initial, setInitial] = useState("U");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  /* null = 登录态未确定（避免游客闪现菜单） */
  const [authed, setAuthed] = useState<boolean | null>(null);
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
      <div className="flex items-center gap-2">
        <Link className="rounded-[6px] border border-line px-3 py-[5px] text-[13px] text-muted transition-[background-color,color] duration-[180ms] hover:bg-hover [font:inherit]" href="/login">登录</Link>
        <Link className="rounded-[6px] border border-primary bg-primary px-3 py-[5px] text-[13px] text-on-primary transition-[background-color,color] duration-[180ms] hover:bg-primary-dark [font:inherit]" href="/register">注册</Link>
      </div>
    );
  }

  /* 菜单条目（导航/操作共用）：flex 行 + 7px 圆角 hover 底色（原 .user-menu-item）；
     DropdownMenuItem 官方基类（flex/gap/rounded/padding 等）经 twMerge 被本类覆盖，视觉 1:1 */
  const itemClass =
    "flex w-full cursor-pointer items-center gap-[10px] rounded-[7px] border-0 bg-transparent p-[9px_10px] text-left text-[13px] text-foreground transition-[background-color] duration-[180ms] hover:bg-hover [font:inherit]";
  const iconClass = "inline-flex w-4 shrink-0 justify-center text-[13px] text-muted";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex cursor-pointer items-center border-0 border-l border-line bg-transparent p-0 pl-[14px] [font:inherit]"
          aria-label="打开用户菜单"
        >
          {avatarUrl ? (
            <AvatarBox path={avatarUrl} name={initial} className="h-[30px] w-[30px] rounded-full bg-hover object-cover" />
          ) : (
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">{initial}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[208px] rounded-[12px] p-2 shadow-card data-[state=open]:animate-[user-menu-in_150ms_ease]"
      >
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/profile">
            <span className={iconClass}><User size={13} /></span>个人主页
          </Link>
        </DropdownMenuItem>
        {/* 商业化入口（订阅计划 /promo 与内容投流 /boost）2026-08-31 起从菜单摘除：
            页面与逻辑保留（均处「即将开放」占位态），恢复入口见 deliverables/ads-monetization-SOP-2026-08-31.md */}
        <DropdownMenuItem className={itemClass} onSelect={onOpenSettings}>
          <span className={iconClass}><Settings size={13} /></span>用户设置
        </DropdownMenuItem>
        <DropdownMenuItem className={itemClass} onSelect={onOpenHelp}>
          <span className={iconClass}><HelpCircle size={13} /></span>帮助与反馈
        </DropdownMenuItem>
        <div className="mx-[2px] my-[6px] h-px bg-line" />
        <DropdownMenuItem
          className={`${itemClass} text-error`}
          disabled={signingOut}
          onSelect={(event) => {
            /* 保持菜单开着显示「退出中…」；跳转 /login 后组件随页面卸载 */
            event.preventDefault();
            void handleSignOut();
          }}
        >
          <span className={iconClass}><LogOut size={13} /></span>{signingOut ? "退出中…" : "退出登录"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
