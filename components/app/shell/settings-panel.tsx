"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * 帮助与反馈面板（下拉菜单唯一面板入口）
 * 2026-08-21 收敛：个人资料/发布管理/账户安全已迁入个人主页（设置 tab）
 */

/** 键值操作行：名称（左）| 当前值（灰）| 操作按钮（右） */
function SettingRow({ label, value, action }: { label: string; value?: string; action?: string }) {
  return (
    <div className="settings-row">
      <span className="settings-row-label">{label}</span>
      {value && <span className="settings-row-value">{value}</span>}
      {action && <button type="button" className="settings-row-action">{action}</button>}
    </div>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="app-modal settings-overlay" onClick={onClose}>
      <div className="settings-panel settings-panel-help" onClick={(event) => event.stopPropagation()}>
        <header className="settings-header">
          <h2>帮助与反馈</h2>
          <button type="button" className="settings-close" onClick={onClose} aria-label="关闭">×</button>
        </header>
        <div className="settings-body">
          <SettingRow label="如何开始使用引力？" action="查看" />
          <SettingRow label="引力和原平台是什么关系？" action="查看" />
          <SettingRow label="有收费计划吗？" action="查看" />
          <div className="settings-row">
            <span className="settings-row-label">查看完整帮助</span>
            <Link className="settings-row-action" href="/help">前往</Link>
          </div>
          <div className="settings-feedback">
            <h3>反馈意见</h3>
            <textarea placeholder="告诉我们你的想法或遇到的问题…" rows={3} />
            <input type="text" placeholder="联系方式（选填）" />
            <button className="settings-submit" type="button">提交反馈</button>
          </div>
        </div>
      </div>
    </div>
  );
}
