/**
 * 账号敏感操作统一弹窗壳（2026-08-29）：修改密码 / 修改邮箱 / 注销账号 共用
 * 2026-09-03 P1 重构：自研遮罩 + 手写 Esc effect → Radix Dialog 组合（ui/dialog）
 *  - Esc / 点遮罩关闭 / 焦点圈定由 Dialog 托管；footer 按钮与面板视觉 1:1 保留
 *  - account-action-modal 宿主类仍承载 decor.css 阴影；.account-action-modal input:focus 光晕不变
 *  - onOpenAutoFocus preventDefault：email/delete 表单内 autoFocus 输入自行聚焦
 *    （不拦会被 Radix FocusScope 抢焦，拦后 React autoFocus 生效，与原行为一致）
 * 密码字段由调用方用 .password-field 复用（眼睛切换）
 */
"use client";

import { X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

/* 弹窗底部按钮基础：取消（描边 hover 底）与 save（实底）——方角形态族，P0 Button(pill) 不适用，保留 */
const footBtnBase =
  "cursor-pointer rounded-lg border-0 px-[14px] py-2 text-[13px] [font:inherit] disabled:cursor-default disabled:opacity-50";

export function AccountActionModal({
  title,
  description,
  busy,
  error,
  children,
  submitLabel,
  submitDisabled,
  danger,
  onSubmit,
  onClose,
}: {
  title: string;
  description?: string;
  busy: boolean;
  error: string;
  children: React.ReactNode;
  submitLabel: string;
  submitDisabled?: boolean;
  /** 危险操作（注销）按钮红色 */
  danger?: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="account-action-modal w-[min(380px,calc(100%-2rem))] rounded-2xl bg-surface p-[22px_22px_18px]"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <header className="mb-[18px] flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="m-0 text-[17px]">{title}</DialogTitle>
            {description && <p className="m-0 mt-1 text-xs leading-[1.6] text-muted">{description}</p>}
          </div>
          <DialogClose asChild>
            <button type="button" className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-hover text-muted" aria-label="关闭"><X size={16} /></button>
          </DialogClose>
        </header>
        <form
          className="grid gap-[13px]"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}
          {error && <p className="m-0 text-xs text-error" role="alert">{error}</p>}
          <footer className="mt-[2px] flex justify-end gap-2">
            <button type="button" className={`${footBtnBase} text-muted enabled:hover:bg-hover`} onClick={onClose} disabled={busy}>取消</button>
            <button
              type="submit"
              className={`${footBtnBase} font-semibold${danger ? " bg-error text-on-error" : " bg-primary text-on-primary enabled:hover:bg-hover"}`}
              disabled={busy || submitDisabled}
            >
              {busy ? "处理中…" : submitLabel}
            </button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
