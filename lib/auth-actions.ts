/**
 * 账号域写动作层（2026-09-04 自 account-action-dialogs 下沉——组件职责分层，见 AGENTS.md）：
 * - updatePassword / updateEmail：Supabase auth 写（改密 / 改邮）
 * - signOut：登出（user-menu 与注销流程共用）
 * - revokeOtherDevices：撤销其他设备会话（改密成功后兜底，防旧会话残留）
 * - deleteAccount：注销账号（服务端删 auth.users + storage；密码随请求提交，服务端复核为安全边界）
 *
 * 状态机（busy/error + re-auth 当前密码）在 hooks/use-account-action；本层只做单次动作，统一返回 { ok }。
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** 修改密码（re-auth 由调用方 hook 完成） */
export async function updatePassword(
  supabase: SupabaseClient,
  newPassword: string,
): Promise<{ ok: boolean }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { ok: !error };
}

/** 修改邮箱（新邮箱确认 + 旧邮箱通知由 Supabase 托管） */
export async function updateEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<{ ok: boolean }> {
  const { error } = await supabase.auth.updateUser({ email });
  return { ok: !error };
}

/** 登出当前会话 */
export async function signOut(supabase: SupabaseClient): Promise<void> {
  await supabase.auth.signOut();
}

/** 撤销其他设备会话。失败静默：不阻塞改密成功反馈 */
export async function revokeOtherDevices(): Promise<void> {
  await fetch("/api/auth/devices", { method: "DELETE" }).catch(() => {});
}

/** 注销账号：服务端复核密码后删除 auth.users + storage */
export async function deleteAccount(password: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
