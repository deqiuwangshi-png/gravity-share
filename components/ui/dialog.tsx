/**
 * 通用弹窗（2026-09-03 P1：shadcn add dialog 生成后按项目令牌改写）
 * 职责：只做弹窗「结构」——Portal / 遮罩 / 焦点圈定 / Esc 与点遮罩关闭 / 标题 aria 关联；
 *      面板视觉（背景/圆角/宽度/内边距/阴影）一律由消费方 className 给出：
 *      各弹窗视觉各异（settings 双栏大面板 / account-action 380 / publish 560 / profile 420），
 *      且无 tailwind-merge 时默认类与覆盖类同属性冲突不可靠（与 lib/cn.ts 策略一致）。
 */
"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/* 遮罩：默认深色（原 .app-modal 视觉）；特例经 DialogContent.overlayClassName 传 decor 宿主类 */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-foreground/38 backdrop-blur-[4px]",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  overlayClassName,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** 遮罩背景特例（settings 浅色 .18）：传 decor 宿主类，未分层规则覆盖默认 .38 */
  overlayClassName?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          /* 居中骨架：不内置宽/背景/圆角/内边距/overflow（见文件头注释 2）——
           * overflow 由消费方声明（publish 传 overflow-y-auto 超高可滚；profile-edit/settings 传
           * overflow-hidden 裁圆角），避免默认类与覆盖类同属性歧义 */
          "fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-bold", className)}
      {...props}
    />
  );
}

export { Dialog, DialogClose, DialogContent, DialogTitle };
