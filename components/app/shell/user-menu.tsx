"use client";

import Link from "next/link";
import { User, Settings, MessageCircle, LogOut } from "lucide-react";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { FEISHU_FEEDBACK_URL } from "@/lib/config";
import { useMyProfile } from "@/hooks/use-my-profile";
import { useSignOut } from "@/hooks/use-sign-out";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * 用户下拉菜单：纯头像触发（不显示昵称/邮箱，昵称见个人主页、邮箱见用户设置）
 * 菜单项：个人主页 / 用户设置 / 反馈意见（→ 飞书表单）/ 退出登录
 */
export function UserMenu({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  /* 身份数据（昵称/头像）与登出编排分别由两个 hook 承载，本组件只做菜单 DOM */
  const { profile, authed } = useMyProfile();
  const { signingOut, signOut } = useSignOut();
  const initial = profile?.name.charAt(0).toUpperCase() ?? "U";
  const avatarUrl = profile?.avatarUrl ?? "";

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
        {/* 2026-08-31 商业化入口（/promo /boost）已摘除；2026-09-03 模块整体删除 */}
        <DropdownMenuItem className={itemClass} onSelect={onOpenSettings}>
          <span className={iconClass}><Settings size={13} /></span>用户设置
        </DropdownMenuItem>
        {/* 2026-09-03 帮助与常见问题不占菜单位——官网落地页 #faq 已承接（/help 与设置 help tab 已删）
            反馈意见常驻入口（外链飞书表单，新标签打开不离开 app） */}
        <DropdownMenuItem asChild className={itemClass}>
          <a href={FEISHU_FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
            <span className={iconClass}><MessageCircle size={13} /></span>反馈意见
          </a>
        </DropdownMenuItem>
        <div className="mx-[2px] my-[6px] h-px bg-line" />
        <DropdownMenuItem
          className={`${itemClass} text-error`}
          disabled={signingOut}
          onSelect={(event) => {
            /* 保持菜单开着显示「退出中…」；跳转 /login 后组件随页面卸载 */
            event.preventDefault();
            void signOut();
          }}
        >
          <span className={iconClass}><LogOut size={13} /></span>{signingOut ? "退出中…" : "退出登录"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
