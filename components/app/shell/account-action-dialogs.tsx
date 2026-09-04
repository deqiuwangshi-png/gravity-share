/**
 * 设置面板三大敏感操作弹窗（2026-09-03 自 settings-panel 拆出，职责拆分档位 1）：
 * 修改密码 / 修改邮箱 / 注销账号 —— 各自完整状态机 + re-auth + 提交逻辑，独立演进不触碰面板核心
 * 壳统一 AccountActionModal（common）；密码字段复用 PwdInput（.password-field + lucide 眼睛显隐）
 * 挂载约定：父以条件渲染控制（{modal === "password" && <PasswordDialog/>}），卸载即销毁内部 state，无需手动重置
 *
 * 2026-09-04 职责收敛（见 deliverables/client-component-layering-plan-2026-09-04.md）：
 * auth 写动作收口 lib/auth-actions（改密/改邮/登出/撤销会话/注销）；
 * busy + error + re-auth 状态机收口 hooks/use-account-action（消除三份重复 re-auth 分支）；
 * 本文件只保留：表单字段受控 state + 字段级校验 + 成功后的 toast 与导航。
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteAccount,
  revokeOtherDevices,
  signOut,
  updateEmail,
  updatePassword,
} from "@/lib/auth-actions";
import { useAccountAction } from "@/hooks/use-account-action";
import { useToast } from "@/components/app/common/toast";
import { AccountActionModal } from "@/components/app/common/account-action-modal";

/* 敏感操作弹窗内裸 input（原 account-action.css .account-action-body input；聚焦光晕由 decor 承载；随迁自 settings-panel） */
const aaInputClass =
  "h-[42px] w-full rounded-[var(--radius-control)] border border-line bg-surface px-[14px] text-[14px] text-foreground outline-none focus:border-primary";

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

/** 修改密码弹窗：re-auth 当前密码 → updateUser → 撤销其他设备会话（兜底防旧会话残留），保持当前登录 */
export function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [curPassword, setCurPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { busy, error, setError, run } = useAccountAction();
  const { show } = useToast();

  async function submit() {
    if (busy) return;
    if (newPassword.length < 8) {
      setError("新密码至少 8 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    if (!curPassword) {
      setError("请输入当前密码以确认身份");
      return;
    }
    const { ok } = await run(curPassword, async (supabase) => {
      if (!(await updatePassword(supabase, newPassword)).ok) return { ok: false };
      /* 改密成功：撤销其他设备会话（兜底防旧会话残留），保持当前登录 */
      await revokeOtherDevices();
      return { ok: true };
    });
    if (ok) {
      show("密码已更新");
      onClose();
    }
  }

  return (
    <AccountActionModal
      title="修改密码"
      description="请输入当前密码确认身份，再设置新密码（至少 8 位）。"
      busy={busy}
      error={error}
      submitLabel="更新密码"
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">当前密码</span><PwdInput value={curPassword} onChange={setCurPassword} placeholder="验证身份" autoComplete="current-password" /></label>
      <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">新密码</span><PwdInput value={newPassword} onChange={setNewPassword} placeholder="至少 8 位字符" autoComplete="new-password" /></label>
      <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">确认新密码</span><PwdInput value={confirmPassword} onChange={setConfirmPassword} placeholder="再次输入新密码" autoComplete="new-password" /></label>
    </AccountActionModal>
  );
}

/** 修改邮箱弹窗：re-auth → updateUser({email})；新邮箱确认 + 旧邮箱通知由 Supabase 托管 */
export function EmailDialog({ currentEmail, onClose }: { currentEmail: string; onClose: () => void }) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, setError, run } = useAccountAction();
  const { show } = useToast();

  async function submit() {
    if (busy) return;
    const target = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setError("请输入正确的邮箱地址");
      return;
    }
    if (target === currentEmail) {
      setError("新邮箱与当前邮箱相同");
      return;
    }
    if (!password) {
      setError("请输入当前密码以确认身份");
      return;
    }
    const { ok } = await run(password, async (supabase) => updateEmail(supabase, target));
    if (ok) {
      show("验证邮件已发送至新邮箱，请点击确认完成变更（旧邮箱会收到通知）");
      onClose();
    }
  }

  return (
    <AccountActionModal
      title="修改邮箱"
      description="新邮箱需点击确认邮件后生效，旧邮箱会收到变更通知。"
      busy={busy}
      error={error}
      submitLabel="发送验证邮件"
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">新邮箱</span><input type="email" className={aaInputClass} value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="新邮箱地址" maxLength={64} autoFocus /></label>
      <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">当前密码</span><PwdInput value={password} onChange={setPassword} placeholder="验证身份" autoComplete="current-password" /></label>
    </AccountActionModal>
  );
}

/** 注销账号弹窗：re-auth 当前密码 → 服务端删 auth.users + storage → 登出回首页 */
export function DeleteDialog({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, setError, run } = useAccountAction();
  const router = useRouter();

  async function submit() {
    if (text !== "删除" || busy) return;
    if (!password) {
      setError("请输入当前密码以确认身份");
      return;
    }
    /* R2：当前密码随请求提交，服务端复核（前端 re-auth 仅 UX，非安全边界） */
    const { ok } = await run(
      password,
      async () => deleteAccount(password),
      "删除失败，请稍后重试",
    );
    if (!ok) return;
    await signOut(createClient());
    router.push("/");
    router.refresh();
  }

  return (
    <AccountActionModal
      title="永久删除账号"
      description="此操作不可恢复：账号、互动与通知将被删除，发布内容保留但不再归属你。"
      danger
      busy={busy}
      error={error}
      submitLabel="确认删除"
      submitDisabled={text !== "删除"}
      onSubmit={() => void submit()}
      onClose={onClose}
    >
      <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">输入「删除」确认</span><input className={aaInputClass} value={text} onChange={(event) => setText(event.target.value)} placeholder="删除" maxLength={2} autoFocus /></label>
      <label className="grid gap-1.5"><span className="text-xs font-semibold text-muted">当前密码</span><PwdInput value={password} onChange={setPassword} placeholder="验证身份" autoComplete="current-password" /></label>
    </AccountActionModal>
  );
}
