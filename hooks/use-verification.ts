/**
 * 官方认证状态机 hook（2026-09-03，自 verify-panel 组件抽离——组件职责分层，见 AGENTS.md）：
 * - 数据态：我的认证记录（fetchVerifications）+ 我的对外标识 badge（users.badge 公开读，与申请状态互证）
 * - 轮询：审核中（pending）时 30s 拉一次；监听 NOTIFICATION_UPDATED_EVENT（审核写站内通知后事件触发）
 * - submit：提交申请（写库在 lib/verification-actions，hook 编排 busy 态 + 成功后刷新）
 * 组件只保留：表单受控态（selected/statement）+ 状态渲染判定 + toast 反馈
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NOTIFICATION_UPDATED_EVENT } from "@/lib/events";
import { fetchVerifications, type VerificationRow } from "@/lib/queries/misc";
import { submitVerification, type VerificationVType } from "@/lib/verification-actions";

export function useVerification() {
  const [myVerifications, setMyVerifications] = useState<VerificationRow[] | null>(null);
  const [myBadge, setMyBadge] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      void supabase
        .from("users")
        .select("badge")
        .eq("id", data.user.id)
        .maybeSingle()
        .then(({ data: me }) => setMyBadge((me?.badge as string) ?? "none"));
    });
    void fetchVerifications(supabase).then(setMyVerifications).catch(() => setMyVerifications([]));
  }, []);

  /* 审核状态实时性：挂载拉一次；审核中（pending）时 30s 轮询；
   * 监听 NOTIFICATION_UPDATED_EVENT（审核通过/驳回会写站内通知，抽屉操作后事件触发） */
  const statusRef = useRef<string | null>(null);
  useEffect(() => {
    statusRef.current = myVerifications?.[0]?.status ?? null;
  }, [myVerifications]);

  useEffect(() => {
    load();
    const onNotify = () => load();
    window.addEventListener(NOTIFICATION_UPDATED_EVENT, onNotify);
    const timer = setInterval(() => {
      if (statusRef.current === "pending") load();
    }, 30000);
    return () => {
      window.removeEventListener(NOTIFICATION_UPDATED_EVENT, onNotify);
      clearInterval(timer);
    };
  }, [load]);

  /** 提交认证申请（写库收口 lib/verification-actions；成功后重拉数据）。返回 { ok } 由组件 toast */
  async function submit(vtype: VerificationVType, statement: string): Promise<{ ok: boolean }> {
    if (submitting) return { ok: false };
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    setSubmitting(true);
    const { ok } = await submitVerification(supabase, {
      userId: user.id,
      vtype,
      statement: statement.trim(),
    });
    setSubmitting(false);
    if (!ok) return { ok: false };
    load();
    return { ok: true };
  }

  return { myVerifications, myBadge, submitting, submit };
}
