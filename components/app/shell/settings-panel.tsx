"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { verifyCurrentPassword } from "@/lib/queries-misc";
import { FEISHU_FEEDBACK_URL } from "@/lib/config";
import { useToast } from "@/components/app/common/toast";
import { AccountActionModal } from "@/components/app/common/account-action-modal";
import { Input } from "@/components/ui/input";
import { FieldRow } from "@/components/ui/field-row";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

/* 2026-09-02 迁移：settings-* 原子类化（原 styles/app/settings.css；profile-edit-modal 行控件同款就地） */
const groupClass = "mt-5 mb-1.5 text-xs font-semibold text-soft first:mt-2";
/* 行骨架常量（rowClass/rowClassPlain/rowLabelClass/errClass）2026-09-03 P3 收编 ui/field-row；以下为 settings 特有语义常量 */
const rowValueClass = "ml-auto text-[13px] text-muted";
const rowActionClass = "shrink-0 cursor-pointer border-0 bg-transparent text-[13px] font-medium text-primary [font:inherit]";
/* 敏感操作弹窗内裸 input（原 account-action.css .account-action-body input；聚焦光晕由 decor 承载） */
const aaInputClass =
  "h-[42px] w-full rounded-[var(--radius-control)] border border-line bg-surface px-[14px] text-[14px] text-foreground outline-none focus:border-primary";

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
    <FieldRow label={label}>
      {value && <span className={rowValueClass}>{value}</span>}
      {action && (
        <button
          type="button"
          className={rowActionClass}
          data-placeholder={onAction ? undefined : ""}
          onClick={onAction}
        >
          {action}
        </button>
      )}
    </FieldRow>
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
        className={aaInputClass}
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
 * 2026-09-02 迁移：settings-* 壳与行控件原子类化（遮罩背景 .settings-overlay、导航 active 竖条 ::before 见 decor.css）
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

  /* Esc 关闭（2026-09-03 P1：手写 document keydown effect 删除——Radix Dialog 内置 Esc → onOpenChange，见下方 Dialog） */

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
      /* R2：当前密码随请求提交，服务端复核（前端 verifyCurrentPassword 仅 UX，非安全边界） */
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
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
    /* Dialog 壳（2026-09-03 P1 重构）：自研遮罩 + 手写 Esc → Radix Dialog 组合；
     * settings-overlay 浅色遮罩（decor.css 未分层 .18）经 overlayClassName 覆盖 Dialog 默认 .38；
     * Esc / 点遮罩关闭由 Radix 托管；嵌套的 AccountActionModal 为独立 Dialog（React 树内嵌套 Root） */
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        overlayClassName="settings-overlay"
        className="grid h-[480px] w-[min(760px,calc(100%-2rem))] grid-cols-[220px_minmax(0,1fr)] overflow-hidden rounded-2xl bg-surface shadow-panel max-[640px]:grid-cols-1"
      >
        <aside className="flex flex-col gap-1 border-r border-line bg-raised p-[28px_24px] max-[640px]:flex-row max-[640px]:overflow-x-auto max-[640px]:border-r-0 max-[640px]:border-b max-[640px]:border-line max-[640px]:p-[12px_14px]">
          {NAV_ITEMS.map(([label, id]) => (
            <button
              key={id}
              type="button"
              className={`settings-nav-item relative block w-full cursor-pointer rounded-lg border-0 bg-transparent p-[10px_12px] text-left text-[13px] text-muted transition-[background-color,color] duration-[180ms] hover:bg-hover hover:text-foreground max-[640px]:whitespace-nowrap${tab === id ? " active bg-hover font-semibold text-foreground" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </aside>
        <section className="flex min-h-0 min-w-0 flex-col">
          <header className="flex items-center justify-between border-b border-line p-[28px_32px]">
            <DialogTitle asChild><h2 className="m-0 text-[16px]">{NAV_ITEMS.find(([, id]) => id === tab)![0]}</h2></DialogTitle>
            <DialogClose asChild>
              <button type="button" className="cursor-pointer border-0 bg-transparent p-1 text-[18px] text-soft" aria-label="关闭">×</button>
            </DialogClose>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-[8px_32px_32px]">
            {tab === "settings" && (
              <>
                <h3 className={groupClass}>个人资料</h3>
                <SettingRow label="邮箱" value={email || "未设置"} action="修改" onAction={() => setModal("email")} />
                {editing === "bio" ? (
                  <div className="border-b border-line">
                    <FieldRow divided={false} label="简介" error={error}>
                      <Input
                        className="ml-auto max-w-[220px] min-w-0 flex-1"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveEdit();
                        }}
                        autoFocus
                        maxLength={80}
                        placeholder="一句话介绍自己（可留空）"
                      />
                      <div className="flex shrink-0 gap-3">
                        <button type="button" onClick={() => setEditing(null)} disabled={saving} className="cursor-pointer border-0 bg-transparent text-[13px] text-primary disabled:cursor-default disabled:text-disabled [font:inherit]">取消</button>
                        <button type="button" className="cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-primary disabled:cursor-default disabled:text-disabled [font:inherit]" onClick={() => void saveEdit()} disabled={saving}>
                          {saving ? "保存中…" : "保存"}
                        </button>
                      </div>
                    </FieldRow>
                  </div>
                ) : (
                  <SettingRow label="简介" value={bio || "未填写"} action="编辑" onAction={() => startEdit("bio")} />
                )}
                <SettingRow label="加入时间" value={joined || "—"} />
              </>
            )}
            {tab === "security" && (
              <>
                <h3 className={groupClass}>账户安全</h3>
                <SettingRow label="修改密码" value="输入当前密码直接修改" action="修改" onAction={() => setModal("password")} />
                <FieldRow label="永久删除账号" labelClassName="text-error">
                  <button type="button" className={`${rowActionClass} text-error`} onClick={() => setModal("delete")}>删除</button>
                </FieldRow>
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
                <FieldRow label="查看完整帮助">
                  <Link className={rowActionClass} href="/help">前往</Link>
                </FieldRow>
                <div className="mt-5 grid gap-3">
                  <h3 className="m-0 text-[13px]">反馈意见</h3>
                  <p className="m-0 text-xs leading-[1.7] text-soft">遇到问题或有建议？通过飞书表单告诉我们，我们会尽快处理。</p>
                  <a
                    className="inline-flex h-[38px] items-center justify-center rounded-lg bg-primary text-[13px] font-semibold text-on-primary no-underline transition-[background-color] duration-[180ms] hover:bg-primary-dark hover:text-on-primary"
                    href={FEISHU_FEEDBACK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    前往提交反馈 →
                  </a>
                </div>
              </>
            )}
          </div>
        </section>
      </DialogContent>

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
          <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">当前密码</span><PwdInput value={curPassword} onChange={setCurPassword} placeholder="验证身份" autoComplete="current-password" /></label>
          <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">新密码</span><PwdInput value={newPassword} onChange={setNewPassword} placeholder="至少 8 位字符" autoComplete="new-password" /></label>
          <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">确认新密码</span><PwdInput value={confirmPassword} onChange={setConfirmPassword} placeholder="再次输入新密码" autoComplete="new-password" /></label>
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
          <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">新邮箱</span><input type="email" className={aaInputClass} value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="新邮箱地址" maxLength={64} autoFocus /></label>
          <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">当前密码</span><PwdInput value={emailPassword} onChange={setEmailPassword} placeholder="验证身份" autoComplete="current-password" /></label>
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
          <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">输入「删除」确认</span><input className={aaInputClass} value={deleteText} onChange={(event) => setDeleteText(event.target.value)} placeholder="删除" maxLength={2} autoFocus /></label>
          <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">当前密码</span><PwdInput value={deletePassword} onChange={setDeletePassword} placeholder="验证身份" autoComplete="current-password" /></label>
        </AccountActionModal>
      )}
    </Dialog>
  );
}
