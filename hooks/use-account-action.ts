/**
 * 敏感账号操作状态机 hook（2026-09-04 自 account-action-dialogs 抽离——组件职责分层，见 AGENTS.md）
 * 三个弹窗（改密 / 改邮 / 注销）流程同构：字段校验 → re-auth 当前密码 → 执行动作 → 成功反馈，
 * 差异只在表单字段与动作本身，故统一为一个 hook（不自造三个近似 hook）。
 *
 * - 托管 busy / error（含 re-auth 失败的统一文案「当前密码不正确」）
 * - run() 返回 { ok }，由组件决定 toast 文案与后续导航
 * - 组件仍保留：表单字段受控 state + 字段级校验（长度 / 格式 / 一致性）
 */
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { verifyCurrentPassword } from "@/lib/queries/misc";

/** re-auth 失败统一提示（三弹窗文案一致，沿用原实现） */
const REAUTH_ERROR = "当前密码不正确";
/** 动作失败默认提示（注销等可传入自定义文案） */
const DEFAULT_ERROR = "修改失败，请稍后重试";

/** 通过 re-auth 后执行的写动作：接 supabase client，返回 { ok } */
type SecuredAction = (supabase: SupabaseClient) => Promise<{ ok: boolean }>;

export function useAccountAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /**
   * 先 re-auth 当前密码（前端仅 UX 校验，安全边界在服务端复核），通过后再执行 action。
   * @param failError 动作失败时的提示文案
   */
  async function run(
    password: string,
    action: SecuredAction,
    failError: string = DEFAULT_ERROR,
  ): Promise<{ ok: boolean }> {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const authed = await verifyCurrentPassword(supabase, password);
    if (!authed) {
      setBusy(false);
      setError(REAUTH_ERROR);
      return { ok: false };
    }
    const { ok } = await action(supabase);
    setBusy(false);
    if (!ok) setError(failError);
    return { ok };
  }

  return { busy, error, setError, run };
}
