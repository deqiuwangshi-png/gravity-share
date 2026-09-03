/**
 * 官方认证写动作层（2026-09-03，自 verify-panel 组件下沉——组件职责分层，见 AGENTS.md）：
 * - submitVerification：insert verifications（RLS 校验作者 = 申请者本人）+ 防重复短 id
 * 类型 vtype 与迁移 021 CHECK ('personal','organization','enterprise') 同源
 * 状态机（数据加载/30s 轮询）在 hooks/use-verification；本动作仅单次写，返回 { ok }
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** 认证类型（与 021 迁移 vtype CHECK 同源；渲染文案 VTYPES 在 verify-panel） */
export type VerificationVType = "personal" | "organization" | "enterprise";

/**
 * 提交认证申请。返回 { ok: boolean }——写库失败为 false（组件 toast 提示）
 */
export async function submitVerification(
  supabase: SupabaseClient,
  input: {
    userId: string;
    vtype: VerificationVType;
    /** 认证理由/材料说明（已 trim） */
    statement: string;
  },
): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("verifications").insert({
    id: `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    user_id: input.userId,
    vtype: input.vtype,
    statement: input.statement,
  });
  return { ok: !error };
}
