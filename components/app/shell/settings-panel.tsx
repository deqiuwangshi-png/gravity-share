"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { myPublishes } from "@/lib/data";

export type PanelId = "profile" | "publishes" | "security" | "help";

const NAV_ITEMS = [
  ["个人资料", "profile"],
  ["发布管理", "publishes"],
  ["账户安全", "security"],
  ["帮助与反馈", "help"],
] as const satisfies ReadonlyArray<readonly [string, PanelId]>;

/** 双栏设置面板：左导航（含会员区）+ 右键值操作行，遮罩/×/Esc 关闭 */
export function SettingsPanel({ initialTab, onClose }: { initialTab: PanelId; onClose: () => void }) {
  const [tab, setTab] = useState<PanelId>(initialTab);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="app-modal settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <aside className="settings-nav">
          {NAV_ITEMS.map(([label, id]) => (
            <button
              key={id}
              type="button"
              className={`settings-nav-item${tab === id ? " active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
          <div className="settings-side">
            <strong>创作者计划</strong>
            <small>Lv.1 · 距离 Lv.2 还差 2 篇发布</small>
            <div className="settings-progress"><i style={{ width: "60%" }} /></div>
          </div>
        </aside>
        <section className="settings-content">
          <header className="settings-header">
            <h2>{NAV_ITEMS.find(([, id]) => id === tab)![0]}</h2>
            <button type="button" className="settings-close" onClick={onClose} aria-label="关闭">×</button>
          </header>
          <div className="settings-body">
            {tab === "profile" && <ProfileSettings />}
            {tab === "publishes" && <PublishesSettings />}
            {tab === "security" && <SecuritySettings />}
            {tab === "help" && <HelpSettings />}
          </div>
        </section>
      </div>
    </div>
  );
}

/** 键值操作行：名称（左）| 当前值（灰）| 操作按钮（右） */
function SettingRow({ label, value, action, danger }: { label: string; value?: string; action?: string; danger?: boolean }) {
  return (
    <div className={`settings-row${danger ? " danger" : ""}`}>
      <span className="settings-row-label">{label}</span>
      {value && <span className="settings-row-value">{value}</span>}
      {action && <button type="button" className="settings-row-action">{action}{danger && " >"}</button>}
    </div>
  );
}

function ProfileSettings() {
  return (
    <>
      <SettingRow label="昵称" value="我的账户" action="修改" />
      <SettingRow label="头像" value="U" action="修改" />
      <SettingRow label="简介" value="暂无简介" action="编辑" />
      <SettingRow label="邮箱" value="name@example.com" action="修改" />
      <SettingRow label="加入时间" value="2026-08" />
    </>
  );
}

function PublishesSettings() {
  return (
    <>
      <div className="settings-toolbar"><button className="settings-new" type="button">+ 新建发布</button></div>
      {myPublishes.length === 0 && <p className="settings-empty">还没有发布内容，点「新建发布」开始。</p>}
      {myPublishes.map((item) => (
        <div className="settings-row" key={item.title}>
          <span className="settings-row-label">{item.title}</span>
          <span className={`settings-status${item.status === "published" ? " live" : ""}`}>{item.status === "published" ? "已发布" : "已下架"}</span>
          <span className="settings-row-actions">
            <button type="button">编辑</button>
            <button type="button">{item.status === "published" ? "下架" : "删除"}</button>
          </span>
        </div>
      ))}
    </>
  );
}

function SecuritySettings() {
  return (
    <>
      <SettingRow label="修改密码" value="上次修改 30 天前" action="修改" />
      <SettingRow label="登录设备" value="2 台在线" action="管理" />
      <SettingRow label="两步验证" value="未开启" action="开启" />
      <SettingRow label="永久删除账号" danger />
    </>
  );
}

function HelpSettings() {
  return (
    <>
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
    </>
  );
}
