/**
 * 举报同步到飞书多维表格（POST /api/reports/feishu）
 * 流程：校验登录 → 24h 同目标去重（防滥用）→ 飞书 tenant_access_token → 多维表格建记录
 * 约定：飞书 = 运营处理工作台；DB reports 表 = 原始留档（状态回写待管理后台统一做）
 * 凭证（环境变量，仅服务端）：FEISHU_APP_ID / FEISHU_APP_SECRET / FEISHU_BITABLE_APP_TOKEN / FEISHU_BITABLE_TABLE_ID
 * 优雅降级：凭证缺失或飞书不可达时返回 501，不影响举报写库主流程（前端静默）
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** 举报原因枚举（与 /guidelines 红线、/enforcement 专项对齐） */
const REPORT_REASONS = ["违法内容", "侵权内容", "广告推广", "骚扰攻击", "虚假信息", "其他"] as const;

/** 同目标去重窗口（毫秒） */
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 飞书多维表格列名（用户建表时对齐；处置备注列留空由运营填写） */
const BITABLE_FIELDS = {
  reportId: "举报ID",
  targetType: "内容类型",
  targetId: "内容ID",
  reason: "原因",
  reporter: "举报人",
  time: "举报时间",
  status: "状态",
  note: "处置备注",
} as const;

/** 换取飞书 tenant_access_token（自建应用，内部 API） */
async function feishuToken(appId: string, appSecret: string): Promise<string> {
  const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    cache: "no-store",
  });
  const data = (await res.json()) as { code?: number; tenant_access_token?: string };
  if (data.code !== 0 || !data.tenant_access_token) throw new Error("feishu_token_failed");
  return data.tenant_access_token;
}

/** 写入多维表格（records create） */
async function feishuAppendRecord(token: string, appToken: string, tableId: string, fields: Record<string, string>) {
  const res = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
      cache: "no-store",
    },
  );
  const data = (await res.json()) as { code?: number };
  if (data.code !== 0) throw new Error("feishu_bitable_failed");
}

export async function POST(request: Request) {
  /* 1. 登录校验（举报人身份） */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  /* 2. 入参校验 */
  let body: { targetType?: unknown; targetId?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { targetType, targetId, reason } = body;
  if (
    (targetType !== "square" && targetType !== "comment") ||
    typeof targetId !== "string" ||
    !targetId ||
    typeof reason !== "string" ||
    !REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  /* 3. 24h 同目标去重：已有 pending 记录则不再写入飞书（DB 留档不受影响） */
  const admin = createAdminClient();
  const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
  const { data: dup } = await admin
    .from("reports")
    .select("id")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "pending")
    .gte("created_at", since)
    .limit(1);
  if ((dup ?? []).length > 0) {
    return NextResponse.json({ ok: true, duplicated: true });
  }

  /* 4. 飞书凭证缺失：优雅降级（举报已写库，仅不同步工作台） */
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  const appToken = process.env.FEISHU_BITABLE_APP_TOKEN;
  const tableId = process.env.FEISHU_BITABLE_TABLE_ID;
  if (!appId || !appSecret || !appToken || !tableId) {
    return NextResponse.json({ error: "feishu_not_configured" }, { status: 501 });
  }

  /* 5. 同步到飞书多维表格（失败不抛给前端：举报主流程已完成） */
  try {
    const token = await feishuToken(appId, appSecret);
    await feishuAppendRecord(token, appToken, tableId, {
      [BITABLE_FIELDS.reportId]: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      [BITABLE_FIELDS.targetType]: targetType === "square" ? "帖子" : "评论",
      [BITABLE_FIELDS.targetId]: targetId,
      [BITABLE_FIELDS.reason]: reason,
      [BITABLE_FIELDS.reporter]: user.id,
      [BITABLE_FIELDS.time]: new Date().toLocaleString("zh-CN", { hour12: false }),
      [BITABLE_FIELDS.status]: "待处理",
      [BITABLE_FIELDS.note]: "",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "feishu_sync_failed" }, { status: 502 });
  }
}
