/**
 * 账号敏感操作统一弹窗壳（2026-08-29）：修改密码 / 修改邮箱 / 注销账号 共用
 * 轻量统一：遮罩 + 居中卡片 + 标题/说明 + 表单区 + 提交/取消 + 错误提示；Esc 或点遮罩关闭
 * 复用 .app-modal 遮罩样式；密码字段由调用方用 .password-field 复用（眼睛切换）
 * 2026-09-02 迁移：壳原子类化（原 styles/app/account-action.css）；
 * 宿主类 account-action-overlay(z110)/account-action-modal(阴影)/input:focus 光晕 由 decor.css 收容；
 * children 的 .field 行与裸 input 由调用方（settings-panel.tsx）原子化
 */
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/* 弹窗底部按钮基础：取消（描边 hover 底）与 save（实底） */
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
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="app-modal account-action-overlay" onClick={onClose}>
      <div className="account-action-modal w-[min(380px,100%)] rounded-2xl bg-surface p-[22px_22px_18px]" onClick={(event) => event.stopPropagation()}>
        <header className="mb-[18px] flex items-start justify-between gap-3">
          <div>
            <h3 className="m-0 text-[17px]">{title}</h3>
            {description && <p className="m-0 mt-1 text-xs leading-[1.6] text-muted">{description}</p>}
          </div>
          <button type="button" className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-hover text-muted" onClick={onClose} aria-label="关闭"><X size={16} /></button>
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
              className={`${footBtnBase} font-semibold text-on-primary${danger ? " bg-error" : " bg-primary enabled:hover:bg-hover"}`}
              disabled={busy || submitDisabled}
            >
              {busy ? "处理中…" : submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
