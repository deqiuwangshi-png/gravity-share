/**
 * 会话辅助（2026-09-04 自 devices-panel 迁出——JWT 解码属纯函数，不该留在组件里）
 * 与项目 lib 层惯例一致：接 SupabaseClient 入参，不自行创建 client。
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 解码当前 access_token（base64url JWT payload）取 sid——标识当前设备。
 * 任一环节异常（无会话 / token 结构异常）返回 null，调用方按「无当前设备标记」处理。
 */
export async function currentSessionId(supabase: SupabaseClient): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return (payload.sid as string) ?? null;
  } catch {
    return null;
  }
}
