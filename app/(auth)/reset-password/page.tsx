import type { Metadata } from "next";
import { cookies } from "next/headers";
import ResetForm from "../_components/reset-form";

export const metadata: Metadata = {
  title: "设置新密码 | 引力",
  description: "为你的账号设置一个新密码。",
};

/**
 * 重置密码落地页（忘记密码最后一环）
 * 邮件链接 → /auth/callback（换 recovery session + 种 yinli_recovery cookie）→ 本页
 * isRecovery=true：recovery 会话免验旧密码（邮件即第二因素）；
 * isRecovery=false：普通登录会话直访 → 表单要求当前密码（堵账号接管）
 */
export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const isRecovery = cookieStore.get("yinli_recovery")?.value === "1";
  return <ResetForm isRecovery={isRecovery} />;
}
