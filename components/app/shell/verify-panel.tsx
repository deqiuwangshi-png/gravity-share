/**
 * 官方认证（client，021）——设置双栏「官方认证」导航项内容
 * 三种认证：个人（→ 金牌「发现者」）/ 机构 / 企业（→ 官方蓝 V + 相框）
 * 状态流：未申请（选类型 + 填说明提交）→ pending 审核中 → approved / rejected
 * 审核：MVP Table Editor（verifications.status 置 approved 并同步 users.badge），无后台代码
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchVerifications, NOTIFICATION_UPDATED_EVENT, type VerificationRow } from "@/lib/queries";
import { useToast } from "@/components/app/common/toast";

const VTYPES = [
  { id: "personal", title: "个人认证", desc: "面向独立创作者/优质发布者，通过后获得金牌「发现者」标识" },
  { id: "organization", title: "机构认证", desc: "面向组织/团队/媒体等机构账号，通过后获得官方蓝 V 标识" },
  { id: "enterprise", title: "企业认证", desc: "面向企业官方账号，通过后获得官方蓝 V 标识" },
] as const;

type VType = (typeof VTYPES)[number]["id"];
const VLABEL: Record<VType, string> = { personal: "个人", organization: "机构", enterprise: "企业" };

export function VerifyPanel() {
  const [myVerifications, setMyVerifications] = useState<VerificationRow[] | null>(null);
  /* 自己的对外标识（users.badge，公开读）——与申请状态互证，避免「badge 已设但 status 未改」脱节 */
  const [myBadge, setMyBadge] = useState<string>("none");
  const [selected, setSelected] = useState<VType | null>(null);
  const [statement, setStatement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { show } = useToast();

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

  const latest = myVerifications?.[0];
  /* 用户视角判定：已认证（申请通过 或 标识已生效）> 审核中 > 可申请 */
  const hasApproved = (myVerifications?.some((v) => v.status === "approved") ?? false) || myBadge !== "none";

  async function submit() {
    if (!selected || submitting) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("verifications").insert({
      id: `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      user_id: user.id,
      vtype: selected,
      statement: statement.trim(),
    });
    setSubmitting(false);
    if (error) {
      show("提交失败，请稍后重试", "danger");
      return;
    }
    show("认证申请已提交，请等待审核");
    setSelected(null);
    setStatement("");
    load();
  }

  /* 已认证（用户视角：有通过申请 或 标识已生效——容忍「badge 已设但 status 未改」脱节） */
  if (hasApproved) {
    const approvedV = myVerifications?.find((v) => v.status === "approved");
    const isOfficial =
      myBadge === "official" || (approvedV ? approvedV.vtype !== "personal" : false);
    const badgeKind: "official" | "discoverer" = isOfficial ? "official" : "discoverer";
    return (
      <div className="verify-status approved">
        <h3>认证已通过</h3>
        <p>
          你已获得
          {badgeKind === "official" ? (
            <span className="verify-badge-inline badge-official">官方认证</span>
          ) : (
            <span className="verify-badge-inline badge-discoverer">发现者</span>
          )}
          标识，将展示在你的头像与名称旁（对外公开）。
        </p>
      </div>
    );
  }

  /* 审核中 */
  if (latest?.status === "pending") {
    return (
      <div className="verify-status">
        <h3>认证申请审核中</h3>
        <p>你的「{VLABEL[latest.vtype]}认证」申请已提交，审核通过后你会收到站内消息通知，也可稍后重新打开本页查看结果。</p>
      </div>
    );
  }

  /* 未申请 或 被驳回（可重新提交） */
  return (
    <div className="verify-panel">
      {latest?.status === "rejected" && (
        <p className="verify-rejected">上次申请未通过，可修改后重新提交。</p>
      )}

      {!selected ? (
        <>
          <p className="verify-desc">选择认证类型开始申请。通过后标识将对外公开显示。</p>
          <div className="verify-types">
            {VTYPES.map((t) => (
              <button
                type="button"
                className="verify-type"
                key={t.id}
                onClick={() => setSelected(t.id)}
              >
                <strong>{t.title}</strong>
                <small>{t.desc}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="verify-form">
          <h3>{VTYPES.find((t) => t.id === selected)!.title}</h3>
          <textarea
            rows={4}
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
            placeholder="请简要说明认证理由与相关材料（如代表作品、机构/企业介绍、官网地址等）"
            aria-label="认证申请说明"
          />
          <div className="verify-form-actions">
            <button type="button" onClick={() => setSelected(null)} disabled={submitting}>返回</button>
            <button type="button" className="primary" onClick={() => void submit()} disabled={submitting || !statement.trim()}>
              {submitting ? "提交中…" : "提交申请"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
