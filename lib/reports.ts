/**
 * 举报域共享常量与提交动作（唯一源，2026-09-03 收编）：
 * - REPORT_REASONS：举报原因枚举（与 /guidelines 红线、/enforcement 专项对齐；report-dialog 单选列表 + /api/reports/feishu 入参校验共用）
 * - REPORT_DETAIL_MAX：「其他」原因补充说明上限
 * - makeReportId：前端短 id 生成（客户端写库；模块级纯函数，规避 react-hooks/purity 拦截）
 * - submitReport：举报提交动作（写库 + 成功后飞书同步编排；2026-09-03 自 report-dialog 组件下沉，
 *   组件层只保留表单受控态与 toast/开关编排——见 AGENTS.md「组件职责分层」）
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const REPORT_REASONS = ["违法内容", "侵权内容", "广告推广", "骚扰攻击", "虚假信息", "其他"] as const;

/** 补充说明最大长度（字符，textarea maxLength 与 route 截断共用） */
export const REPORT_DETAIL_MAX = 500;

/** 举报记录短 id（与 reports.id text 主键匹配） */
export function makeReportId(): string {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 内容归属类型（square 帖子 / comment 评论；与 content-actions 同款字面量，模块内部使用） */
type ReportTarget = "square" | "comment";

export type ReportSubmitInput = {
  /** 内容归属：square 帖子 / comment 评论 */
  targetType: ReportTarget;
  targetId: string;
  reason: string;
  /** 「其他」原因时的补充说明（非其他为空串） */
  detail?: string;
};

/**
 * 提交举报：RLS 写 reports 表（detail 一并入库）→ 成功后同步飞书工作台
 * （fire-and-forget：凭证缺失/表未加列/不可达均静默，不影响主流程）
 * 返回 { ok: true } 或 { ok: false; message }（未登录 / 写库失败），toast 反馈由组件层编排
 */
export async function submitReport(
  supabase: SupabaseClient,
  input: ReportSubmitInput,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "请先登录" };
  const { error } = await supabase.from("reports").insert({
    id: makeReportId(),
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    detail: input.detail ?? "",
  });
  if (error) return { ok: false, message: "举报失败，请重试" };
  void fetch("/api/reports/feishu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => {});
  return { ok: true };
}
