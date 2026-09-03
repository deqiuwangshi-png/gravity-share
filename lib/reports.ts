/**
 * 举报域共享常量（唯一源，2026-09-03 收编）：
 * - REPORT_REASONS：举报原因枚举（与 /guidelines 红线、/enforcement 专项对齐；report-dialog 单选列表 + /api/reports/feishu 入参校验共用）
 * - REPORT_DETAIL_MAX：「其他」原因补充说明上限
 * - makeReportId：前端短 id 生成（客户端写库；模块级纯函数，规避 react-hooks/purity 拦截）
 */
export const REPORT_REASONS = ["违法内容", "侵权内容", "广告推广", "骚扰攻击", "虚假信息", "其他"] as const;

/** 补充说明最大长度（字符，textarea maxLength 与 route 截断共用） */
export const REPORT_DETAIL_MAX = 500;

/** 举报记录短 id（与 reports.id text 主键匹配） */
export function makeReportId(): string {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
