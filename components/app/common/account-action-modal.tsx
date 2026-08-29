/**
 * 账号敏感操作统一弹窗壳（2026-08-29）：修改密码 / 修改邮箱 / 注销账号 共用
 * 轻量统一：遮罩 + 居中卡片 + 标题/说明 + 表单区 + 提交/取消 + 错误提示；Esc 或点遮罩关闭
 * 复用现有 .app-modal 遮罩样式；密码字段由调用方用 .password-field 复用（眼睛切换）
 */
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

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
      <div className="account-action-modal" onClick={(event) => event.stopPropagation()}>
        <header className="account-action-head">
          <div>
            <h3>{title}</h3>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="account-action-close" onClick={onClose} aria-label="关闭"><X size={16} /></button>
        </header>
        <form
          className="account-action-body"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}
          {error && <p className="account-action-error" role="alert">{error}</p>}
          <footer className="account-action-foot">
            <button type="button" onClick={onClose} disabled={busy}>取消</button>
            <button type="submit" className={`save${danger ? " danger" : ""}`} disabled={busy || submitDisabled}>
              {busy ? "处理中…" : submitLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
