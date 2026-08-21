import type { Metadata } from "next";
import ResetForm from "../_components/reset-form";

export const metadata: Metadata = {
  title: "设置新密码 | 引力",
  description: "为你的账号设置一个新密码。",
};

/**
 * 重置密码落地页（忘记密码最后一环）
 * 邮件链接 → /auth/callback（换 recovery session）→ 本页 → updateUser({ password })
 */
export default function ResetPasswordPage() {
  return <ResetForm />;
}
