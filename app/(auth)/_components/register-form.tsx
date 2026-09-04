"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_EMAIL_MAX_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
  validateRegisterInput,
} from "@/lib/auth-validation";
import { AuthSubmit, authButtonClass } from "./auth-submit";
import { AuthField, AuthInput } from "./auth-field";

const submitLinkClass = `${authButtonClass} mt-1 justify-between pl-5 pr-[17px]`;

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    const validation = validateRegisterInput(email, password, confirm);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: signUpError } = await createClient().auth.signUp({
        email: validation.email,
        password: validation.password,
      });
      if (signUpError) {
        setError("注册失败，请检查邮箱和密码后重试。");
        return;
      }
      if (data.session) {
        router.push("/home");
        router.refresh();
        return;
      }
      setSubmittedEmail(email);
    } catch {
      setError("注册服务暂不可用，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedEmail) {
    return (
      <div className="mx-auto w-full max-w-[414px]">
        <div>
          <p className="mb-3 text-[13px] font-bold text-primary">验证你的邮箱</p>
          <h2 className="m-0 text-[34px] tracking-[-1.5px]">验证邮件已发送</h2>
          <p className="mt-3 text-sm text-muted">我们已向 {submittedEmail} 发送验证邮件。完成验证后即可登录引力。</p>
        </div>
        <Link className={submitLinkClass} href="/login">返回登录<span aria-hidden="true">→</span></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[414px]">
      <div>
        <p className="mb-3 text-[13px] font-bold text-primary">创建账号</p>
        <h2 className="m-0 text-[34px] tracking-[-1.5px]">加入引力</h2>
        <p className="mt-3 text-sm text-muted">创建账号，开始发现和分享。</p>
      </div>
      <form className="mt-[22px] grid gap-[15px]" onSubmit={handleSubmit}>
        <AuthField label="邮箱">
          <AuthInput name="email" type="email" autoComplete="email" placeholder="name@example.com" maxLength={AUTH_EMAIL_MAX_LENGTH} required />
        </AuthField>
        <AuthField label="密码">
          <span className="password-field">
            <AuthInput name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="至少 8 位字符" minLength={8} maxLength={AUTH_PASSWORD_MAX_LENGTH} required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "隐藏密码" : "显示密码"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button>
          </span>
        </AuthField>
        <AuthField label="确认密码">
          <span className="password-field">
            <AuthInput name="confirm" type={showConfirm ? "text" : "password"} autoComplete="new-password" placeholder="再次输入密码" minLength={8} maxLength={AUTH_PASSWORD_MAX_LENGTH} required />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? "隐藏确认密码" : "显示确认密码"} aria-pressed={showConfirm}>{showConfirm ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button>
          </span>
        </AuthField>
        {error && <p className="-mt-1 text-xs text-primary" role="alert">{error}</p>}
        <AuthSubmit className="mt-1 justify-between pl-5 pr-[17px]" disabled={submitting}>{submitting ? "注册中…" : "注册"}<span aria-hidden="true">→</span></AuthSubmit>
      </form>
      <p className="mt-[18px] text-center text-[13px] text-muted">已有账号？<Link href="/login" className="font-semibold text-primary">返回登录</Link></p>
    </div>
  );
}
