"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { OAUTH_PROVIDERS } from "@/lib/config";

type Channel = "email" | "phone";

/**
 * 手机号通道临时下架开关（2026-08-24：短信网关暂缓配置，先隐藏入口避免用户卡在「验证码发送失败」）
 * 不删除任何代码；改回 true 即可随时恢复手机号 OTP 登录（发码/校验/倒计时逻辑完整保留）
 */
const PHONE_AUTH_ENABLED = false;

/**
 * 第三方品牌官方图标（行业标准做法：GitHub octocat mark / Google 四色 G）
 * lucide 刻意不收录品牌图标（无 Google），故内联官方品牌 SVG，避免为两个图标引入依赖
 */
function ProviderIcon({ id }: { id: string }) {
  if (id === "google") {
    return (
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 40.2 44 35 44 24c0-1.3-.1-2.6-.4-3.9z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

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
        {/* 新用户注册引导（登录即注册：无独立注册页，2026-08-27 新增，命中 .auth-heading p:last-child 样式） */}
        <p>没有账号？输入邮箱和密码即可注册。</p>
      </div>

      {PHONE_AUTH_ENABLED && (
        <div className="auth-mode-switch" role="tablist" aria-label="账号通道">
          <button type="button" className={channel === "email" ? "active" : ""} role="tab" aria-selected={channel === "email"} onClick={() => setChannel("email")}>邮箱</button>
          <button type="button" className={channel === "phone" ? "active" : ""} role="tab" aria-selected={channel === "phone"} onClick={() => setChannel("phone")}>手机号</button>
        </div>
      )}

      {channel === "email" ? (
        /* key 隔离：邮箱表单（非受控输入）与手机号表单（受控 value）切换时必须重建，
         * 否则 React 复用 DOM 触发「非受控 → 受控」冲突警告 */
        <form key="email" className="auth-form" onSubmit={submitEmail}>
          <label><span>邮箱</span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
          <label><span>密码</span><span className="password-field"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="至少 8 位字符" minLength={8} required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "隐藏密码" : "显示密码"}>{showPassword ? "隐藏" : "显示"}</button></span></label>
          <div className="auth-form-options"><label className="checkbox-label"><input type="checkbox" name="remember" /> <span>记住我</span></label><Link href="/forgot-password">忘记密码？</Link></div>
          {error && <p className="auth-mock-note auth-error" role="alert">{error}</p>}
          {info && <p className="auth-mock-note auth-info" role="status">{info}</p>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "登录中…" : "登录 / 注册"}<span aria-hidden="true">→</span></button>
        </form>
      ) : (
        <form key="phone" className="auth-form" onSubmit={submitPhone}>
          <label><span>手机号</span><input name="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+86 13800138000" required /></label>
          <label><span>验证码</span><span className="otp-field"><input name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="6 位验证码" required /><button type="button" className="otp-send" onClick={() => void sendOtp()} disabled={submitting || otpCooldown > 0}>{otpCooldown > 0 ? `${otpCooldown}s 后重发` : "获取验证码"}</button></span></label>
          {error && <p className="auth-mock-note auth-error" role="alert">{error}</p>}
          {info && <p className="auth-mock-note auth-info" role="status">{info}</p>}
          <button className="auth-submit" type="submit" disabled={submitting || !otpSent}>{submitting ? "验证中…" : "登录 / 注册"}<span aria-hidden="true">→</span></button>
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
            <ProviderIcon id={provider.id} />{provider.label}
          </button>
        ))}
      </div>
    </div>
  );
}
