"use client";

import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * 下拉菜单（2026-09-03 shadcn add 官方版改写，骨架化哲学同 dialog.tsx）：
 * 1. 令牌冲突兜底（globals.css shadcn 轨道注释规则）：官方 focus:bg-accent——项目 --accent 是金色点缀
 *    #f3c969（当 hover/focus 底会错）→ focus:bg-hover（项目 hover 底语义键）
 * 2. 删官方动画类（data-open/data-closed/slide-in-*）：两消费方观感各异——user-menu 走 decor.css ⑨
 *    user-menu-in keyframes、post-menu 无动画，由消费方 className 决定
 * 3. 删官方 w-(--radix-dropdown-menu-trigger-width)：菜单同宽触发器是移动端风格，post-menu 触发器仅
 *    26px 圆钮会锁死菜单宽度；宽度由消费方 min-w/w 决定
 * 4. 删 [&_svg:not([class*='size-'])]:size-4：会覆盖消费方 lucide size={13} 图标为 16px（1:1 破坏）
 * 5. cursor-default → cursor-pointer（项目菜单 hover 手型惯例）
 * 6. ring-1 ring-foreground/10 → border border-line（项目菜单面板是 border-line 描边，非 ring）
 * 视觉 1:1：面板底色 bg-popover(=surface 白)、文字 text-popover-foreground(=foreground)、
 * 边框 border-line 由 Content 默认提供；宽/圆角/阴影/padding/动画由消费方 className 传入（twMerge 覆盖）
 * 只导出实际消费成员（Root/Trigger/Content/Item）防 knip 死代码；后续需要 Sub/Checkbox 等成员时
 * 再 shadcn add dropdown-menu --overwrite 取回
 */
function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 max-h-(--radix-dropdown-menu-content-available-height) overflow-y-auto rounded-lg border border-line bg-popover p-1 text-popover-foreground shadow-md outline-none",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        "relative flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:bg-hover focus:text-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  );
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };
