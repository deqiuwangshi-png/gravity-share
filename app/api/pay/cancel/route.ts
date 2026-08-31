/**
 * 取消订阅（2026-08-30，Waffo MoR）
 * 链路：校验本人生效中订阅 → 调 Waffo 取消（external_id 反查）→ 本地置 cancelled
 * Waffo 未配置时返回友好提示（T&C 承诺在线取消；通道就绪前可邮件取消）
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { waffoConfigured, getWaffoClient } from "@/lib/waffo";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const { orderId } = body;
  if (!orderId) {
    return NextResponse.json({ error: "缺少订单参数" }, { status: 400 });
  }

  const { data: order } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "订阅不存在" }, { status: 404 });
  }
  if (order.status !== "active") {
    return NextResponse.json({ error: "仅生效中的订阅可取消" }, { status: 409 });
  }

  if (!waffoConfigured()) {
    return NextResponse.json(
      { error: "支付通道准备中，可发送邮件至客服邮箱取消订阅", code: "NOT_CONFIGURED" },
      { status: 503 },
    );
  }
  const client = await getWaffoClient();
  if (!client) {
    return NextResponse.json(
      { error: "支付通道暂不可用，请稍后再试", code: "NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  try {
    /* Waffo 侧取消（停止下期扣费；active/trialing 取消后 status 为 canceling，
     * 权益保留至 current_period_end，与 T&C 第六条的承诺一致） */
    if (order.external_id) {
      await client.orders.cancelSubscription({ orderId: order.external_id });
    }
    const admin = createAdminClient();
    const { error } = await admin
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) {
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("waffo cancel failed", err);
    return NextResponse.json({ error: "取消失败，请稍后重试或邮件联系客服" }, { status: 502 });
  }
}
