import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import ResetForm from "../_components/reset-form";

export const metadata: Metadata = {
  title: "设置新密码 | 引力",
  description: "为你的账号设置一个新密码。",
};

/**
 * 重置密码落地页（忘记密码最后一环）
 * 邮件链接 → /auth/callback（换 recovery session + 种 yinli_recovery cookie，值 = uid）→ 本页
 * isRecovery=true：cookie 值与当前 session uid 匹配（recovery 会话免验旧密码，邮件即第二因素）；
 * isRecovery=false：普通登录会话直访 / cookie 不匹配 → 表单要求当前密码（堵账号接管）
 * R2（2026-09-02）：cookie 由固定值 "1" 改为绑定 uid，并校验 === 当前 session uid——
 *   仅凭泄漏的 cookie（无对应 recovery session）无法获得免密豁免
 */
export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const recoveryCookie = cookieStore.get("yinli_recovery")?.value;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isRecovery = !!recoveryCookie && !!user && recoveryCookie === user.id;
  return <ResetForm isRecovery={isRecovery} />;
}
