"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FormState = "checking" | "ready" | "invalid";

/**
 * 设置新密码表单（忘记密码最后一环）
 * 校验 recovery session（邮件链接经 /auth/callback 建立）→ updateUser({ password })
 * 顺带支持已登录用户直接改密码（普通 session 访问本页也可用）
 */
export default function ResetForm() {
  const [state, setState] = useState<FormState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void createClient().auth.getSession().then(({ data }) => {
      setState(data.session ? "ready" : "invalid");
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setSaving(true);
    setError("");
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError("设置失败，请重试");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  if (state === "checking") {
    return (
      <div className="auth-card">
        <div className="auth-heading">
          <h2>正在验证链接…</h2>
        </div>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="auth-card">
        <div className="auth-heading">
          <p className="auth-kicker">链接无效</p>
          <h2>重置链接无效或已过期</h2>
          <p>请重新获取重置链接，链接自发出起 30 分钟内有效。</p>
        </div>
        <Link className="auth-submit" href="/forgot-password">重新获取链接<span aria-hidden="true">→</span></Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <p className="auth-kicker">设置新密码</p>
        <h2>重置密码</h2>
        <p>输入你的新密码，至少 8 位。</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>新密码</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位字符"
            minLength={8}
            required
          />
        </label>
        <label>
          <span>确认新密码</span>
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="再次输入新密码"
            minLength={8}
            required
          />
        </label>
        {error && <p className="auth-mock-note auth-error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={saving}>
          {saving ? "保存中…" : "更新密码"}<span aria-hidden="true">→</span>
        </button>
      </form>
    </div>
  );
}
