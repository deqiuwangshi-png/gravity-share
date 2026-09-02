"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthSubmit, authButtonClass } from "./auth-submit";
import { AuthField, AuthInput } from "./auth-field";

/** 提交主按钮样式串（Link 版按钮：原 .auth-submit 用于 <Link> 的场景） */
const submitLinkClass = `${authButtonClass} mt-1 justify-between pl-5 pr-[17px]`;

export default function ForgotForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const supabase = createClient();

    setSubmitting(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      /* 复用 /auth/callback（批次 C）：exchangeCodeForSession 建立 recovery session → /reset-password 设置新密码 */
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setSubmitting(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto w-full max-w-[414px]">
        <div>
          <p className="mb-3 text-[13px] font-bold text-primary">检查你的邮箱</p>
          <h2 className="m-0 text-[34px] tracking-[-1.5px]">重置链接已发送</h2>
          <p className="mt-3 text-sm text-muted">如果该邮箱已注册，你会收到一封包含重置链接的邮件，链接 30 分钟内有效。</p>
        </div>
        <Link className={submitLinkClass} href="/login">返回登录<span aria-hidden="true">→</span></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[414px]">
      <div>
        <h2 className="m-0 text-[34px] tracking-[-1.5px]">重置密码</h2>
        <p className="mt-3 text-sm text-muted">请输入你的注册邮箱，我们会发送一封密码重置链接（30 分钟内有效）。</p>
      </div>
      <form className="mt-[22px] grid gap-[15px]" onSubmit={handleSubmit}>
        <AuthField label="邮箱">
          <AuthInput name="email" type="email" autoComplete="email" placeholder="name@example.com" required />
        </AuthField>
        {error && <p className="-mt-1 text-xs text-primary" role="alert">{error}</p>}
        <AuthSubmit className="mt-1 justify-between pl-5 pr-[17px]" disabled={submitting}>{submitting ? "发送中…" : "发送重置链接"}<span aria-hidden="true">→</span></AuthSubmit>
      </form>
      <p className="mt-[18px] text-center text-[13px] text-muted">想起来了？<Link href="/login" className="font-semibold text-primary">返回登录</Link></p>
    </div>
  );
}
