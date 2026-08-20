"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="auth-card">
        <div className="auth-heading">
          <p className="auth-kicker">检查你的邮箱</p>
          <h2>重置链接已发送</h2>
          <p>如果该邮箱已注册，你会收到一封包含重置链接的邮件，链接 30 分钟内有效。</p>
        </div>
        <Link className="auth-submit" href="/login">返回登录<span aria-hidden="true">→</span></Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <p className="auth-kicker">找回密码</p>
        <h2>重置密码</h2>
        <p>输入注册邮箱，我们将发送密码重置链接。</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label><span>邮箱</span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
        <button className="auth-submit" type="submit">发送重置链接<span aria-hidden="true">→</span></button>
      </form>
      <p className="auth-switch-copy">想起来了？<Link href="/login">返回登录</Link></p>
    </div>
  );
}
