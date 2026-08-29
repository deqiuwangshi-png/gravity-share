"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { verifyCurrentPassword } from "@/lib/queries";
import { FEISHU_FEEDBACK_URL } from "@/lib/config";
import { useToast } from "@/components/app/common/toast";
import { AccountActionModal } from "@/components/app/common/account-action-modal";
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

/** 密码输入框（复用 .password-field + lucide 眼睛；每个实例独立显隐 state） */
function PwdInput({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className="password-field">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
      />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "隐藏密码" : "显示密码"} aria-pressed={show}>
        {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </span>
  );
}

/**
 * 设置面板（下拉菜单弹出）：用户设置 / 账户安全 / 登录设备 / 官方认证 / 帮助
 * 2026-08-29 统一：改密码 / 改邮箱 / 注销 全部收敛为 AccountActionModal 弹窗（re-auth 校验当前密码）
 */
export function SettingsPanel({ initialTab, onClose }: { initialTab: PanelId; onClose: () => void }) {
  const [tab, setTab] = useState<PanelId>(initialTab);
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [joined, setJoined] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  /* 简介行内编辑 */
  const [editing, setEditing] = useState<"bio" | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* 敏感操作统一弹窗：password / email / delete */
  const [modal, setModal] = useState<"password" | "email" | "delete" | null>(null);
  /* 修改密码 */
  const [curPassword, setCurPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  /* 修改邮箱 */
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  /* 注销 */
  const [deleteText, setDeleteText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
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

  function closeModal() {
    setModal(null);
    setCurPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError("");
    setNewEmail(""); setEmailPassword(""); setEmailError("");
    setDeleteText(""); setDeletePassword(""); setDeleteError("");
  }

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

  /** 修改密码（弹窗，2026-08-29）：re-auth 当前密码 → updateUser → 撤销其他设备会话 */
  async function submitPasswordChange() {
    if (passwordBusy) return;
    if (newPassword.length < 8) {
      setPasswordError("新密码至少 8 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的新密码不一致");
      return;
    }
    if (!curPassword) {
      setPasswordError("请输入当前密码以确认身份");
      return;
    }
    setPasswordBusy(true);
    setPasswordError("");
    const supabase = createClient();
    const ok = await verifyCurrentPassword(supabase, curPassword);
    if (!ok) {
      setPasswordBusy(false);
      setPasswordError("当前密码不正确");
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordBusy(false);
    if (updateError) {
      setPasswordError("修改失败，请稍后重试");
      return;
    }
    /* 改密成功：撤销其他设备会话（兜底防旧会话残留），保持当前登录 */
    await fetch("/api/auth/devices", { method: "DELETE" }).catch(() => {});
    show("密码已更新");
    closeModal();
  }

  /** 修改邮箱（弹窗，2026-08-29）：re-auth → updateUser({email})；新邮箱确认 + 旧邮箱通知由 Supabase 托管 */
  async function submitEmailChange() {
    if (emailBusy) return;
    const target = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setEmailError("请输入正确的邮箱地址");
      return;
    }
    if (target === email) {
      setEmailError("新邮箱与当前邮箱相同");
      return;
    }
    if (!emailPassword) {
      setEmailError("请输入当前密码以确认身份");
      return;
    }
    setEmailBusy(true);
    setEmailError("");
    const supabase = createClient();
    const ok = await verifyCurrentPassword(supabase, emailPassword);
    if (!ok) {
      setEmailBusy(false);
      setEmailError("当前密码不正确");
      return;
    }
    const { error } = await supabase.auth.updateUser({ email: target });
    setEmailBusy(false);
    if (error) {
      setEmailError("修改失败，请稍后重试");
      return;
    }
    show("验证邮件已发送至新邮箱，请点击确认完成变更（旧邮箱会收到通知）");
    closeModal();
  }

  /** 注销账号（弹窗，2026-08-29）：re-auth 当前密码 → 服务端删 auth.users + storage */
  async function submitDeleteAccount() {
    if (deleteText !== "删除" || deleting) return;
    if (!deletePassword) {
      setDeleteError("请输入当前密码以确认身份");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    const supabase = createClient();
    const ok = await verifyCurrentPassword(supabase, deletePassword);
    if (!ok) {
      setDeleting(false);
      setDeleteError("当前密码不正确");
      return;
    }
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setDeleting(false);
      setDeleteError("删除失败，请稍后重试");
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
                <SettingRow label="邮箱" value={email || "未设置"} action="修改" onAction={() => setModal("email")} />
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
                <SettingRow label="修改密码" value="输入当前密码直接修改" action="修改" onAction={() => setModal("password")} />
                <div className="settings-row danger">
                  <span className="settings-row-label">永久删除账号</span>
                  <button type="button" className="settings-row-action danger-action" onClick={() => setModal("delete")}>删除</button>
                </div>
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

      {/* 敏感操作统一弹窗（2026-08-29）：同一套壳 + re-auth，视觉流程一致 */}
      {modal === "password" && (
        <AccountActionModal
          title="修改密码"
          description="请输入当前密码确认身份，再设置新密码（至少 8 位）。"
          busy={passwordBusy}
          error={passwordError}
          submitLabel="更新密码"
          onSubmit={() => void submitPasswordChange()}
          onClose={closeModal}
        >
          <label className="field"><span>当前密码</span><PwdInput value={curPassword} onChange={setCurPassword} placeholder="验证身份" autoComplete="current-password" /></label>
          <label className="field"><span>新密码</span><PwdInput value={newPassword} onChange={setNewPassword} placeholder="至少 8 位字符" autoComplete="new-password" /></label>
          <label className="field"><span>确认新密码</span><PwdInput value={confirmPassword} onChange={setConfirmPassword} placeholder="再次输入新密码" autoComplete="new-password" /></label>
        </AccountActionModal>
      )}
      {modal === "email" && (
        <AccountActionModal
          title="修改邮箱"
          description="新邮箱需点击确认邮件后生效，旧邮箱会收到变更通知。"
          busy={emailBusy}
          error={emailError}
          submitLabel="发送验证邮件"
          onSubmit={() => void submitEmailChange()}
          onClose={closeModal}
        >
          <label className="field"><span>新邮箱</span><input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="新邮箱地址" maxLength={64} autoFocus /></label>
          <label className="field"><span>当前密码</span><PwdInput value={emailPassword} onChange={setEmailPassword} placeholder="验证身份" autoComplete="current-password" /></label>
        </AccountActionModal>
      )}
      {modal === "delete" && (
        <AccountActionModal
          title="永久删除账号"
          description="此操作不可恢复：账号、互动与通知将被删除，发布内容保留但不再归属你。"
          danger
          busy={deleting}
          error={deleteError}
          submitLabel="确认删除"
          submitDisabled={deleteText !== "删除"}
          onSubmit={() => void submitDeleteAccount()}
          onClose={closeModal}
        >
          <label className="field"><span>输入「删除」确认</span><input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="删除" maxLength={2} autoFocus /></label>
          <label className="field"><span>当前密码</span><PwdInput value={deletePassword} onChange={setDeletePassword} placeholder="验证身份" autoComplete="current-password" /></label>
        </AccountActionModal>
      )}
    </div>
  );
}
