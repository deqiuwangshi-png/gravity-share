"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { OAUTH_PROVIDERS } from "@/lib/config";
import { safeNextPath } from "@/lib/links";
import { AuthSubmit } from "./auth-submit";
import { AuthField, AuthInput } from "./auth-field";

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
      <svg className="shrink-0" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 40.2 44 35 44 24c0-1.3-.1-2.6-.4-3.9z" />
      </svg>
    );
  }
  return (
    <svg className="shrink-0" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
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

  /** 回源地址白名单（防开放重定向，登录 / OAuth 共用；规则收敛到 lib/links.ts safeNextPath） */
  function safeNext(): string {
    const nextParam = new URLSearchParams(window.location.search).get("next") ?? "";
    return safeNextPath(nextParam);
  }

  /** 第三方登录（GitHub / Google；由 OAUTH_PROVIDERS 驱动） */
  async function handleOAuth(provider: Provider) {
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext())}` },
      });
      if (authError) setError("第三方登录暂不可用，请稍后重试");
    } catch {
      setError("第三方登录暂不可用，请稍后重试");
    }
  }

  /** 邮箱通道：只负责登录；注册由 /register 独立负责 */
  async function submitEmail(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) return;
    setSubmitting(true);
    try {
      const { error: loginError } = await createClient().auth.signInWithPassword({ email, password });
      if (loginError) {
        setError("邮箱或密码不正确，请重试，或使用“忘记密码”找回。");
        return;
      }
      router.push(safeNext());
      router.refresh();
    } catch {
      setError("登录服务暂不可用，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
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
    try {
      const { error: sendError } = await createClient().auth.signInWithOtp({
        phone: normalized,
        options: { shouldCreateUser: true },
      });
      if (sendError) {
        setError("验证码发送失败，请稍后重试（短信网关配置后可用）。");
        return;
      }
      setOtpSent(true);
      setOtpCooldown(60);
      setInfo("验证码已发送，请输入验证码。");
    } catch {
      setError("认证服务暂不可用，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
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
    try {
      const { error: verifyError } = await createClient().auth.verifyOtp({
        phone: phone.trim(),
        token,
        type: "sms",
      });
      if (verifyError) {
        setError("验证码不正确或已过期，请重试。");
        return;
      }
      router.push(safeNext());
      router.refresh();
    } catch {
      setError("认证服务暂不可用，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[414px]">
        <div>
          <h2 className="m-0 text-[34px] tracking-[-1.5px]">欢迎来到引力</h2>
          <p className="mt-3 text-sm text-muted">登录你的引力账号，继续发现和分享。</p>
        </div>

      {PHONE_AUTH_ENABLED && (
        <div className="mt-[26px] flex gap-[26px] border-b border-line" role="tablist" aria-label="账号通道">
          <button type="button" className={`relative px-0.5 pb-[13px] text-sm text-soft ${channel === "email" ? "font-bold text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary" : ""}`} role="tab" aria-selected={channel === "email"} onClick={() => setChannel("email")}>邮箱</button>
          <button type="button" className={`relative px-0.5 pb-[13px] text-sm text-soft ${channel === "phone" ? "font-bold text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary" : ""}`} role="tab" aria-selected={channel === "phone"} onClick={() => setChannel("phone")}>手机号</button>
        </div>
      )}

      {channel === "email" ? (
        /* key 隔离：邮箱表单（非受控输入）与手机号表单（受控 value）切换时必须重建，
         * 否则 React 复用 DOM 触发「非受控 → 受控」冲突警告 */
        <form key="email" className="mt-[22px] grid gap-[15px]" onSubmit={submitEmail}>
          <AuthField label="邮箱">
            <AuthInput name="email" type="email" autoComplete="email" placeholder="name@example.com" required />
          </AuthField>
          <AuthField label="密码">
            <span className="password-field">
              <AuthInput name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="至少 8 位字符" minLength={8} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "隐藏密码" : "显示密码"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button>
            </span>
          </AuthField>
          <div className="-mt-[3px] flex items-center justify-between text-xs text-muted">
            <Link href="/forgot-password" className="font-semibold text-primary">忘记密码？</Link>
          </div>
          {error && <p className="-mt-1 text-xs text-primary" role="alert">{error}</p>}
          <AuthSubmit className="mt-1 justify-between pl-5 pr-[17px]" disabled={submitting}>{submitting ? "登录中…" : "登录"}<span aria-hidden="true">→</span></AuthSubmit>
        </form>
      ) : (
        <form key="phone" className="mt-[22px] grid gap-[15px]" onSubmit={submitPhone}>
          <AuthField label="手机号">
            <AuthInput name="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+86 13800138000" required />
          </AuthField>
          <AuthField label="验证码">
            <span className="flex items-center gap-2">
              <AuthInput name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="6 位验证码" className="min-w-0 flex-1" required />
              <button type="button" className="shrink-0 whitespace-nowrap rounded-control border border-line-primary bg-primary-subtle px-3 py-[9px] text-xs text-primary enabled:hover:border-primary enabled:hover:bg-primary-soft disabled:border-line disabled:bg-hover disabled:text-disabled" onClick={() => void sendOtp()} disabled={submitting || otpCooldown > 0}>{otpCooldown > 0 ? `${otpCooldown}s 后重发` : "获取验证码"}</button>
            </span>
          </AuthField>
          {error && <p className="-mt-1 text-xs text-primary" role="alert">{error}</p>}
          {info && <p className="-mt-1 text-xs text-primary" role="status">{info}</p>}
          <AuthSubmit className="mt-1 justify-between pl-5 pr-[17px]" disabled={submitting || !otpSent}>{submitting ? "验证中…" : "登录"}<span aria-hidden="true">→</span></AuthSubmit>
        </form>
      )}

      <p className="mt-[18px] text-center text-[13px] text-muted">还没有账号？<Link href="/register" className="font-semibold text-primary">创建账号</Link></p>

      <div className="mb-[14px] mt-5 flex items-center gap-[14px] text-xs text-soft">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <span>或者使用</span>
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>
      <div className="flex gap-[10px]">
        {OAUTH_PROVIDERS.filter((p) => p.enabled).map((provider) => (
          <button
            key={provider.id}
            className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-control border border-line bg-surface text-[13px] font-semibold text-foreground transition-[border-color,background-color] duration-[180ms] hover:border-primary hover:bg-primary-subtle"
            type="button"
            onClick={() => void handleOAuth(provider.id)}
          >
            <ProviderIcon id={provider.id} />{provider.label}
          </button>
        ))}
      </div>
    </div>
    </>
  );
}
