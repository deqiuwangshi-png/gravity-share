"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { OAUTH_PROVIDERS } from "@/lib/config";
import type { Provider } from "@supabase/supabase-js";

type AuthMode = "login" | "register";

/** 登录 / 注册表单（Supabase Auth）——保留既有 UI，提交逻辑走 SDK */
export default function AuthForm({ mode }: { mode: AuthMode }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const isLogin = mode === "login";

  /* N3：OAuth 回调失败时 /login?error=auth 显示提示
   * 微任务调度 setState：避免 effect 内同步 setState（react-hooks/set-state-in-effect）且无 hydration 冲突 */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "auth") {
      const timer = setTimeout(() => setError("第三方登录失败，请重试或使用邮箱登录"), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  /** 回源地址白名单（防开放重定向，登录 / OAuth 共用） */
  function safeNext(): string {
    const nextParam = new URLSearchParams(window.location.search).get("next") ?? "";
    return nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.includes("\\")
      ? nextParam
      : "/home";
  }

  /** 第三方登录（GitHub / Google；由 OAUTH_PROVIDERS 驱动） */
  async function handleOAuth(provider: Provider) {
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext())}` },
    });
    if (authError) setError("第三方登录暂不可用，请稍后重试");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const supabase = createClient();

    if (isLogin) {
      setSubmitting(true);
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      setSubmitting(false);
      if (authError) {
        setError(authError.message.includes("Invalid login credentials") ? "邮箱或密码不正确。" : authError.message);
        return;
      }
      /* 回源：未登录访问 /home 时 proxy 会带 ?next=/home；白名单校验防开放重定向（BUG-7） */
      router.push(safeNext());
      router.refresh();
      return;
    }

    /* 注册：邮箱验证开启，提示查收邮件；昵称入 user_metadata（触发器建档用） */
    const name = String(form.get("name") ?? "").trim();
    setSubmitting(true);
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name || "引力用户" } },
    });
    setSubmitting(false);
    if (authError) {
      setError(authError.message.includes("already registered") ? "该邮箱已注册，请直接登录。" : authError.message);
      return;
    }
    setInfo("验证邮件已发送，请查收邮箱完成激活后再登录。");
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
        {!isLogin && <label><span>昵称</span><input name="name" type="text" autoComplete="nickname" placeholder="你希望大家怎么称呼你？" /></label>}
        <label><span>邮箱</span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
        <label><span>密码</span><span className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} placeholder="至少 8 位字符" minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>{showPassword ? "隐藏" : "显示"}</button></span></label>
        {isLogin && <div className="auth-form-options"><label className="checkbox-label"><input type="checkbox" name="remember" /> <span>记住我</span></label><Link href="/forgot-password">忘记密码？</Link></div>}
        {error && <p className="auth-mock-note auth-error" role="alert">{error}</p>}
        {info && <p className="auth-mock-note auth-info" role="status">{info}</p>}
        <button className="auth-submit" type="submit" disabled={submitting}>{isLogin ? (submitting ? "登录中…" : "登录") : (submitting ? "创建中…" : "创建账号")}<span aria-hidden="true">→</span></button>
      </form>

      <div className="auth-divider"><span>或者使用</span></div>
      <div className="auth-social-row">
        {OAUTH_PROVIDERS.filter((p) => p.enabled).map((provider) => (
          <button
            key={provider.id}
            className="auth-social"
            type="button"
            onClick={() => void handleOAuth(provider.id)}
          >
            <span className="social-mark" aria-hidden="true">{provider.mark}</span>使用 {provider.label} 继续
          </button>
        ))}
      </div>
      <p className="auth-switch-copy">{isLogin ? "还没有账号？" : "已经有账号了？"} <Link href={isLogin ? "/register" : "/login"}>{isLogin ? "立即注册" : "返回登录"}</Link></p>
    </div>
  );
}
