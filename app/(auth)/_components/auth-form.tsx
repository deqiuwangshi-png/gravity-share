"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { OAUTH_PROVIDERS } from "@/lib/config";

type Channel = "email" | "phone";

/**
 * 统一认证表单（登录即注册，单一入口 /login）
 * 邮箱通道：登录失败自动建档（保留邮箱验证）；手机号通道：OTP 验证码（登录即注册）
 * 欢迎文案精简为「欢迎来到引力」；无登录/注册之分
 */
export default function AuthForm() {
  const [channel, setChannel] = useState<Channel>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  /* 手机号 OTP */
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const router = useRouter();

  /* N3：OAuth 回调失败时 /login?error=auth 显示提示
   * 微任务调度 setState：避免 effect 内同步 setState（react-hooks/set-state-in-effect）且无 hydration 冲突 */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "auth") {
      const timer = setTimeout(() => setError("第三方登录失败，请重试或使用邮箱登录"), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  /* OTP 发送倒计时（60s） */
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

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

  /** 邮箱通道：登录即注册（登录失败 → signUp 试探区分 新用户 / 密码错） */
  async function submitEmail(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) return;
    const supabase = createClient();

    setSubmitting(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (!loginError) {
      setSubmitting(false);
      router.push(safeNext());
      router.refresh();
      return;
    }

    /* 登录失败 → 尝试自动建档（登录即注册）；保留邮箱验证：建档成功提示查收邮件 */
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);
    if (!signUpError) {
      setInfo("验证邮件已发送，请查收邮箱完成激活后再登录。");
      return;
    }
    /* 邮箱已存在 → 是密码错（Supabase 登录与注册对同一邮箱的错误码可区分此分支） */
    if (signUpError.message.includes("already registered")) {
      setError("密码不正确，请重试，或使用忘记密码。");
      return;
    }
    setError(signUpError.message.includes("Invalid login credentials") ? "邮箱或密码不正确。" : signUpError.message);
  }

  /** 手机号通道：发送 OTP（shouldCreateUser=true：号码不存在自动建档 = 登录即注册） */
  async function sendOtp() {
    if (otpCooldown > 0 || submitting) return;
    const normalized = phone.trim();
    if (!/^\+?[0-9]{7,15}$/.test(normalized)) {
      setError("请输入正确的手机号（含国家区号，如 +8613800138000）。");
      return;
    }
    setError("");
    setInfo("");
    setSubmitting(true);
    const { error: sendError } = await createClient().auth.signInWithOtp({
      phone: normalized,
      options: { shouldCreateUser: true },
    });
    setSubmitting(false);
    if (sendError) {
      setError("验证码发送失败，请稍后重试（短信网关配置后可用）。");
      return;
    }
    setOtpSent(true);
    setOtpCooldown(60);
    setInfo("验证码已发送，请输入验证码。");
  }

  /** 手机号通道：校验 OTP → 进入（OTP 即身份验证，无需邮箱验证） */
  async function submitPhone(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpSent) {
      setError("请先获取验证码。");
      return;
    }
    const token = otp.trim();
    if (token.length < 4) {
      setError("请输入验证码。");
      return;
    }
    setError("");
    setInfo("");
    setSubmitting(true);
    const { error: verifyError } = await createClient().auth.verifyOtp({
      phone: phone.trim(),
      token,
      type: "sms",
    });
    setSubmitting(false);
    if (verifyError) {
      setError("验证码不正确或已过期，请重试。");
      return;
    }
    router.push(safeNext());
    router.refresh();
  }

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <h2>欢迎来到引力</h2>
      </div>

      <div className="auth-mode-switch" role="tablist" aria-label="账号通道">
        <button type="button" className={channel === "email" ? "active" : ""} role="tab" aria-selected={channel === "email"} onClick={() => setChannel("email")}>邮箱</button>
        <button type="button" className={channel === "phone" ? "active" : ""} role="tab" aria-selected={channel === "phone"} onClick={() => setChannel("phone")}>手机号</button>
      </div>

      {channel === "email" ? (
        /* key 隔离：邮箱表单（非受控输入）与手机号表单（受控 value）切换时必须重建，
         * 否则 React 复用 DOM 触发「非受控 → 受控」冲突警告 */
        <form key="email" className="auth-form" onSubmit={submitEmail}>
          <label><span>邮箱</span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
          <label><span>密码</span><span className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="至少 8 位字符" minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>{showPassword ? "隐藏" : "显示"}</button></span></label>
          <div className="auth-form-options"><label className="checkbox-label"><input type="checkbox" name="remember" /> <span>记住我</span></label><Link href="/forgot-password">忘记密码？</Link></div>
          {error && <p className="auth-mock-note auth-error" role="alert">{error}</p>}
          {info && <p className="auth-mock-note auth-info" role="status">{info}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "登录中…" : "继续"}<span aria-hidden="true">→</span></button>
        </form>
      ) : (
        <form key="phone" className="auth-form" onSubmit={submitPhone}>
          <label><span>手机号</span><input name="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+86 13800138000" required /></label>
          <label><span>验证码</span><span className="otp-field"><input name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="6 位验证码" required /><button type="button" className="otp-send" onClick={() => void sendOtp()} disabled={submitting || otpCooldown > 0}>{otpCooldown > 0 ? `${otpCooldown}s 后重发` : "获取验证码"}</button></span></label>
          {error && <p className="auth-mock-note auth-error" role="alert">{error}</p>}
          {info && <p className="auth-mock-note auth-info" role="status">{info}</p>}
          <button className="auth-submit" type="submit" disabled={submitting || !otpSent}>{submitting ? "验证中…" : "继续"}<span aria-hidden="true">→</span></button>
        </form>
      )}

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
      <p className="auth-switch-copy">不用注册，直接用邮箱或手机号继续即可。</p>
    </div>
  );
}
