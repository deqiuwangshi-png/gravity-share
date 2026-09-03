/**
 * 官方认证（client，021）——设置双栏「官方认证」导航项内容
 * 三种认证：个人（→ 金牌「发现者」）/ 机构 / 企业（→ 官方蓝 V + 相框）
 * 状态流：未申请（选类型 + 填说明提交）→ pending 审核中 → approved / rejected
 * 审核：MVP Table Editor（verifications.status 置 approved 并同步 users.badge），无后台代码
 * 2026-09-02 迁移：verify-* 原子类化（原 styles/app/verify.css 面板段；徽标基础段已随 author-badge/avatar-box 内化）
 * 2026-09-03 职责分层：数据态/轮询/提交编排 → hooks/use-verification；写库 → lib/verification-actions
 *   本组件只留表单受控态（selected/statement）+ 三态渲染判定 + toast 反馈
 */
"use client";

import { useState } from "react";
import { useVerification } from "@/hooks/use-verification";
import type { VerificationVType } from "@/lib/verification-actions";
import { useToast } from "@/components/app/common/toast";
import { Button } from "@/components/ui/button";

const VTYPES: { id: VerificationVType; title: string; desc: string }[] = [
  { id: "personal", title: "个人认证", desc: "面向独立创作者/优质发布者，通过后获得金牌「发现者」标识" },
  { id: "organization", title: "机构认证", desc: "面向组织/团队/媒体等机构账号，通过后获得官方蓝 V 标识" },
  { id: "enterprise", title: "企业认证", desc: "面向企业官方账号，通过后获得官方蓝 V 标识" },
];

const VLABEL: Record<VerificationVType, string> = { personal: "个人", organization: "机构", enterprise: "企业" };

/* 认证类型选择卡（.verify-type 原子化） */
const verifyTypeBtn =
  "grid cursor-pointer gap-1 rounded-[10px] border border-line bg-surface p-[14px_16px] text-left transition-[border-color] duration-[180ms] enabled:hover:border-line-primary [font:inherit]";

export function VerifyPanel() {
  const { myVerifications, myBadge, submitting, submit } = useVerification();
  const [selected, setSelected] = useState<VerificationVType | null>(null);
  const [statement, setStatement] = useState("");
  const { show } = useToast();

  const latest = myVerifications?.[0];
  /* 用户视角判定：已认证（申请通过 或 标识已生效）> 审核中 > 可申请 */
  const hasApproved = (myVerifications?.some((v) => v.status === "approved") ?? false) || myBadge !== "none";

  async function handleSubmit() {
    if (!selected) return;
    const { ok } = await submit(selected, statement);
    if (!ok) {
      show("提交失败，请稍后重试", "danger");
      return;
    }
    show("认证申请已提交，请等待审核");
    setSelected(null);
    setStatement("");
  }

  /* 已认证（用户视角：有通过申请 或 标识已生效——容忍「badge 已设但 status 未改」脱节） */
  if (hasApproved) {
    const approvedV = myVerifications?.find((v) => v.status === "approved");
    const isOfficial =
      myBadge === "official" || (approvedV ? approvedV.vtype !== "personal" : false);
    const badgeKind: "official" | "discoverer" = isOfficial ? "official" : "discoverer";
    return (
      <div className="grid gap-[14px]">
        <h3 className="m-0 text-[14px]">认证已通过</h3>
        <p className="m-0 text-[13px] leading-[1.7] text-muted">
          你已获得
          {badgeKind === "official" ? (
            <span className="mx-1 inline-flex items-center align-middle text-verify-blue">官方认证</span>
          ) : (
            <span className="mx-1 inline-flex items-center rounded-full bg-[linear-gradient(90deg,var(--verify-gold),var(--verify-gold-deep))] px-2 py-[2px] align-middle text-[11px] font-bold text-[var(--verify-gold-ink)]">发现者</span>
          )}
          标识，将展示在你的头像与名称旁（对外公开）。
        </p>
      </div>
    );
  }

  /* 审核中 */
  if (latest?.status === "pending") {
    return (
      <div className="grid gap-[14px]">
        <h3 className="m-0 text-[14px]">认证申请审核中</h3>
        <p className="m-0 text-[13px] leading-[1.7] text-muted">你的「{VLABEL[latest.vtype]}认证」申请已提交，审核通过后你会收到站内消息通知，也可稍后重新打开本页查看结果。</p>
      </div>
    );
  }

  /* 未申请 或 被驳回（可重新提交） */
  return (
    <div className="grid gap-[14px]">
      {latest?.status === "rejected" && (
        <p className="m-0 rounded-lg border border-error px-3 py-[10px] text-xs text-error">上次申请未通过，可修改后重新提交。</p>
      )}

      {!selected ? (
        <>
          <p className="m-0 text-xs leading-[1.7] text-soft">选择认证类型开始申请。通过后标识将对外公开显示。</p>
          <div className="grid gap-[10px]">
            {VTYPES.map((t) => (
              <button
                type="button"
                className={verifyTypeBtn}
                key={t.id}
                onClick={() => setSelected(t.id)}
              >
                <strong className="text-[13px]">{t.title}</strong>
                <small className="text-xs leading-[1.6] text-soft">{t.desc}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-[10px]">
          <h3 className="m-0 text-[13px]">{VTYPES.find((t) => t.id === selected)!.title}</h3>
          <textarea
            rows={4}
            value={statement}
            onChange={(event) => setStatement(event.target.value)}
            placeholder="请简要说明认证理由与相关材料（如代表作品、机构/企业介绍、官网地址等）"
            aria-label="认证申请说明"
            className="min-h-[88px] w-full resize-y rounded-lg border border-line bg-surface px-3 py-[10px] text-[13px] leading-[1.7] text-foreground outline-none focus:border-line-primary [font:inherit]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(null)} disabled={submitting}>
              返回
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => void handleSubmit()}
              disabled={submitting || !statement.trim()}
            >
              {submitting ? "提交中…" : "提交申请"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
