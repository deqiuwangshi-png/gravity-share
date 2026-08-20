"use client";

import Link from "next/link";
import { useState } from "react";

type AuthMode = "login" | "register";

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isLogin = mode === "login";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <p className="auth-kicker">欢迎回来</p>
        <h2>{isLogin ? "登录引力" : "加入引力"}</h2>
        <p>{isLogin ? "继续发现那些值得被看见的好东西。" : "创建你的账号，开始分享与发现。"}</p>
      </div>

      <div className="auth-mode-switch" role="tablist" aria-label="认证方式">
        <Link className={isLogin ? "active" : ""} href="/login" role="tab" aria-selected={isLogin}>登录</Link>
        <Link className={!isLogin ? "active" : ""} href="/register" role="tab" aria-selected={!isLogin}>注册</Link>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {!isLogin && <label><span>昵称</span><input name="name" type="text" autoComplete="nickname" placeholder="你希望大家怎么称呼你？" required /></label>}
        <label><span>邮箱</span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
        <label><span>密码</span><span className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} placeholder="至少 8 位字符" minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>{showPassword ? "隐藏" : "显示"}</button></span></label>
        {isLogin && <div className="auth-form-options"><label className="checkbox-label"><input type="checkbox" name="remember" /> <span>记住我</span></label><Link href="/forgot-password">忘记密码？</Link></div>}
        <button className="auth-submit" type="submit">{isLogin ? "登录" : "创建账号"}<span aria-hidden="true">→</span></button>
        {submitted && <p className="auth-mock-note" role="status">Mock 提交成功，后续可接入真实认证服务。</p>}
      </form>

      <div className="auth-divider"><span>或者使用</span></div>
      <button className="auth-social" type="button" onClick={() => setSubmitted(true)}><span className="social-mark" aria-hidden="true">◎</span>使用 GitHub 继续</button>
      <p className="auth-switch-copy">{isLogin ? "还没有账号？" : "已经有账号了？"} <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "立即注册" : "返回登录"}</Link></p>
    </div>
  );
}
