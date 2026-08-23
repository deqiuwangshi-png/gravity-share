"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FEISHU_FEEDBACK_URL } from "@/lib/config";
import { useToast } from "@/components/app/common/toast";
import { DevicesPanel } from "./devices-panel";
import { VerifyPanel } from "./verify-panel";

export type PanelId = "settings" | "security" | "devices" | "verify" | "help";

/** 双栏左侧导航（2026-08-23：账户安全/登录设备抽离为独立项；021 加官方认证） */
const NAV_ITEMS = [
  ["用户设置", "settings"],
  ["账户安全", "security"],
  ["登录设备", "devices"],
  ["官方认证", "verify"],
  ["帮助与反馈", "help"],
] as const satisfies ReadonlyArray<readonly [string, PanelId]>;

/** 键值操作行：名称（左）| 当前值（灰）| 操作按钮（右）；onAction 存在时为真实按钮，否则为占位 */
function SettingRow({
  label,
  value,
  action,
  onAction,
}: {
  label: string;
  value?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="settings-row">
      <span className="settings-row-label">{label}</span>
      {value && <span className="settings-row-value">{value}</span>}
      {action && (
        <button
          type="button"
          className="settings-row-action"
          data-placeholder={onAction ? undefined : ""}
          onClick={onAction}
        >
          {action}
        </button>
      )}
    </div>
  );
}

/**
 * 设置面板（下拉菜单弹出）：用户设置 / 帮助与反馈
 * 用户设置数据源：public.users（2a 起为权威）+ session.user（邮箱）
 * 昵称/简介行内编辑 → update public.users（RLS 自写）
 */
export function SettingsPanel({ initialTab, onClose }: { initialTab: PanelId; onClose: () => void }) {
  const [tab, setTab] = useState<PanelId>(initialTab);
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [joined, setJoined] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  /* 简介行内编辑（头像/昵称已迁移到主页「编辑个人资料」弹窗） */
  const [editing, setEditing] = useState<"bio" | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* 注销账号（输入「删除」确认，防误触） */
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  /* 修改密码（重置邮件发送中） */
  const [passwordSending, setPasswordSending] = useState(false);
  const router = useRouter();
  const { show } = useToast();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      setEmail(u.email ?? "");
      const { data: profile } = await supabase
        .from("users")
        .select("bio, created_at")
        .eq("id", u.id)
        .maybeSingle();
      setBio((profile?.bio as string) ?? "");
      setJoined((profile?.created_at as string)?.slice(0, 7) ?? "");
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function startEdit(field: "bio") {
    setEditing(field);
    setDraft(bio);
    setError("");
  }

  async function saveEdit() {
    if (!userId || !editing) return;
    setSaving(true);
    setError("");
    const { error: saveError } = await createClient().from("users").update({ bio: draft }).eq("id", userId);
    setSaving(false);
    if (saveError) {
      setError("保存失败，请稍后重试");
      return;
    }
    setBio(draft);
    setEditing(null);
  }

  /**
   * 修改密码（复用忘记密码链路）：发送重置邮件 → 邮件链接经 /auth/callback 建 recovery session
   * → /reset-password 设置新密码。与 forgot-form 同款 redirectTo，链路已跑通。
   */
  async function handleChangePassword() {
    if (passwordSending) return;
    if (!email) {
      show("未绑定邮箱，无法重置密码", "danger");
      return;
    }
    setPasswordSending(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setPasswordSending(false);
    if (error) {
      show("邮件发送失败，请稍后重试", "danger");
      return;
    }
    show("重置邮件已发送，请查收邮箱");
  }

  /** 注销账号（服务端删 auth.users + storage，级联清互动/通知；内容保留但作者置空） */
  async function handleDeleteAccount() {
    if (deleteText !== "删除" || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setDeleteError("删除失败，请稍后重试");
      setDeleting(false);
    }
  }

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
        </aside>
        <section className="settings-content">
          <header className="settings-header">
            <h2>{NAV_ITEMS.find(([, id]) => id === tab)![0]}</h2>
            <button type="button" className="settings-close" onClick={onClose} aria-label="关闭">×</button>
          </header>
          <div className="settings-body">
            {tab === "settings" && (
              <>
                <h3 className="settings-group">个人资料</h3>
                <SettingRow label="邮箱" value={email || "未设置"} action="修改" />
                {editing === "bio" ? (
                  <div className="settings-edit">
                    <div className="settings-row">
                      <span className="settings-row-label">简介</span>
                      <input
                        className="settings-input"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveEdit();
                        }}
                        autoFocus
                        maxLength={80}
                        placeholder="一句话介绍自己（可留空）"
                      />
                      <div className="settings-row-actions">
                        <button type="button" onClick={() => setEditing(null)} disabled={saving}>取消</button>
                        <button type="button" className="save" onClick={() => void saveEdit()} disabled={saving}>
                          {saving ? "保存中…" : "保存"}
                        </button>
                      </div>
                    </div>
                    {error && <p className="settings-edit-error">{error}</p>}
                  </div>
                ) : (
                  <SettingRow label="简介" value={bio || "未填写"} action="编辑" onAction={() => startEdit("bio")} />
                )}
                <SettingRow label="加入时间" value={joined || "—"} />
              </>
            )}
            {tab === "security" && (
              <>
                <h3 className="settings-group">账户安全</h3>
                <SettingRow label="修改密码" value="通过验证邮件重置" action={passwordSending ? "发送中…" : "发送邮件"} onAction={() => void handleChangePassword()} />
                <div className="settings-row danger">
                  <span className="settings-row-label">永久删除账号</span>
                  {deleteConfirm ? (
                    <span className="settings-delete-confirm">
                      <input
                        className="settings-input"
                        value={deleteText}
                        onChange={(event) => setDeleteText(event.target.value)}
                        placeholder="输入「删除」"
                        maxLength={2}
                        aria-label="输入删除确认"
                      />
                      <button type="button" onClick={() => { setDeleteConfirm(false); setDeleteText(""); }} disabled={deleting}>取消</button>
                      <button type="button" className="save" onClick={() => void handleDeleteAccount()} disabled={deleting || deleteText !== "删除"}>
                        {deleting ? "删除中…" : "确认删除"}
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="settings-row-action danger-action" onClick={() => setDeleteConfirm(true)}>删除</button>
                  )}
                </div>
                {deleteConfirm && !deleting && <p className="settings-edit-error">此操作不可恢复：账号、互动与通知将被删除，发布内容保留但不再归属你。</p>}
                {deleteError && <p className="settings-edit-error" role="alert">{deleteError}</p>}
              </>
            )}
            {tab === "devices" && (
              <DevicesPanel />
            )}
            {tab === "verify" && (
              <VerifyPanel />
            )}
            {tab === "help" && (
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
                  <p className="settings-feedback-desc">遇到问题或有建议？通过飞书表单告诉我们，我们会尽快处理。</p>
                  <a className="settings-feedback-link" href={FEISHU_FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
                    前往提交反馈 →
                  </a>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
