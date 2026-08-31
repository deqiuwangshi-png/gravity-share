/**
 * Waffo Webhook 回调（2026-08-30，Waffo MoR 权益发放核心）
 * 链路：req.text() 读原始 body → verifyWebhook 验签（内嵌公钥，无需 secret）→
 *       幂等去重（webhook_events 表，035）→ 10 事件分发 → 权益发放 → 返回 200
 * 订单绑定：优先 data.orderMerchantExternalId（下单时写入内部订单 id），
 *           续费/退款等场景兜底按 data.orderId 反查 external_id
 * ⚠ 必须 req.text() 读原始 body——先 json() 解析会导致验签失败
 * ⚠ 同步处理完再返 200：Next.js Serverless 返回响应后进程可能被回收，
 *   异步任务会丢（官方「先返 200 再异步」针对常驻进程）。处理失败返回 5xx 触发官方重试（最多 3 次）
 * ⚠ 依赖 035 迁移的 webhook_events 表（event_type + event_id 联合主键做幂等）
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook, WebhookEventType, type WebhookEvent, type WebhookEventData } from "@waffo/pancake-ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/** 企业档门槛（与 034 触发器一致：amount ≥ 500 转人工，不自动生效） */
const ENTERPRISE_MIN = 500;

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-waffo-signature");
  if (!signature) {
    return new Response("missing signature", { status: 401 });
  }

  let event: WebhookEvent<WebhookEventData>;
  try {
    event = verifyWebhook<WebhookEventData>(raw, signature);
  } catch {
    return new Response("invalid signature", { status: 401 });
  }

  const admin = createAdminClient();

  /* 幂等去重：eventType + eventId 已处理过 → 直接 200（官方重试安全，防止重复发权益） */
  const { data: dup, error: dupError } = await admin
    .from("webhook_events")
    .select("event_type")
    .eq("event_type", event.eventType)
    .eq("event_id", event.eventId)
    .maybeSingle();
  if (dupError) {
    /* 表缺失等：直接暴露，避免静默继续导致权益错乱 */
    console.error("webhook dedup lookup failed", dupError);
    return new Response("dedup unavailable", { status: 500 });
  }
  if (dup) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(admin, event);
    /* 处理成功后才记录幂等行（处理失败不记录，5xx 让 Waffo 重试） */
    const { error: insError } = await admin.from("webhook_events").insert({
      event_type: event.eventType,
      event_id: event.eventId,
    });
    if (insError) {
      throw insError;
    }
  } catch (err) {
    console.error("webhook handle failed", event.eventType, event.eventId, err);
    return new Response("handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/* ---------- 事件分发 ---------- */

async function handleEvent(admin: SupabaseClient, event: WebhookEvent<WebhookEventData>) {
  const d = event.data;
  switch (event.eventType) {
    case WebhookEventType.OrderCompleted:
      await onOrderCompleted(admin, d);
      break;
    case WebhookEventType.SubscriptionActivated:
    case WebhookEventType.SubscriptionPaymentSucceeded:
      await onSubscriptionPaid(admin, d);
      break;
    case WebhookEventType.SubscriptionCanceling:
    case WebhookEventType.SubscriptionCanceled:
      await setSubStatus(admin, d, "cancelled");
      break;
    case WebhookEventType.SubscriptionUncanceled:
      await setSubStatus(admin, d, "active");
      break;
    case WebhookEventType.SubscriptionPastDue:
      await setSubStatus(admin, d, "past_due");
      break;
    case WebhookEventType.SubscriptionUpdated:
      /* 升降级：官方标注该事件待「产品切换」功能上线后激活；当前仅记录 */
      console.info("subscription.updated", { orderId: d.orderId, productName: d.productName });
      break;
    case WebhookEventType.RefundSucceeded:
      await onRefundSucceeded(admin, d);
      break;
    case WebhookEventType.RefundFailed:
      console.info("refund.failed", { orderId: d.orderId, reason: d.refundReason });
      break;
    default:
      console.warn("unknown event", event.eventType);
  }
}

/* ---------- 事件处理 ---------- */

/** 投流支付成功：置 paid + 写 external_id + 计算置顶到期（企业档不自动生效） */
async function onOrderCompleted(admin: SupabaseClient, d: WebhookEventData) {
  const localId = d.orderMerchantExternalId;
  if (!localId) {
    console.warn("order.completed without orderMerchantExternalId", d.orderId);
    return;
  }
  const { data: order } = await admin.from("promo_orders").select("*").eq("id", localId).maybeSingle();
  if (!order) {
    console.warn("promo order not found", localId);
    return;
  }
  if (order.status !== "pending") {
    /* 已处理过（幂等兜底） */
    return;
  }
  const isEnterprise = order.amount >= ENTERPRISE_MIN;
  const upd: Record<string, unknown> = {
    status: "paid",
    external_id: d.orderId,
    paid_at: new Date().toISOString(),
  };
  if (!isEnterprise && order.duration_minutes) {
    /* 确定性分发：featured_until = 支付时刻 + 购买时长（034 触发器算好的分钟数） */
    upd.featured_until = new Date(Date.now() + order.duration_minutes * 60000).toISOString();
    /* 置顶生效：同步 square_posts.featured_until（024 展示位逻辑，过期自动回落） */
    await admin.from("square_posts").update({ featured_until: upd.featured_until }).eq("id", order.post_id);
  }
  await admin.from("promo_orders").update(upd).eq("id", localId);
}

/** 订阅首付/续费成功：置 active + 写 external_id + 更新周期到期时间（事件体自带 currentPeriodEnd） */
async function onSubscriptionPaid(admin: SupabaseClient, d: WebhookEventData) {
  const upd: Record<string, unknown> = {
    status: "active",
    updated_at: new Date().toISOString(),
  };
  if (d.currentPeriodEnd) {
    upd.current_period_end = new Date(d.currentPeriodEnd).toISOString();
  }
  /* 通路 1：orderMerchantExternalId = 我们的 sub_xxx */
  if (d.orderMerchantExternalId) {
    upd.external_id = d.orderId;
    await admin.from("subscriptions").update(upd).eq("id", d.orderMerchantExternalId);
    return;
  }
  /* 通路 2：续费场景按 Waffo 订单号反查 external_id */
  if (d.orderId) {
    await admin.from("subscriptions").update(upd).eq("external_id", d.orderId);
    return;
  }
  console.warn("subscription paid without binding", d.orderId);
}

/** 订阅状态更新（canceling / canceled / uncanceled / past_due） */
async function setSubStatus(admin: SupabaseClient, d: WebhookEventData, status: string) {
  const upd = { status, updated_at: new Date().toISOString() };
  if (d.orderMerchantExternalId) {
    await admin.from("subscriptions").update(upd).eq("id", d.orderMerchantExternalId);
    return;
  }
  if (d.orderId) {
    await admin.from("subscriptions").update(upd).eq("external_id", d.orderId);
    return;
  }
  console.warn("subscription status without binding", d.orderId);
}

/** 退款成功：撤销权益——投流置顶立即回落 / 订阅失效 */
async function onRefundSucceeded(admin: SupabaseClient, d: WebhookEventData) {
  const localId = d.orderMerchantExternalId;
  if (!localId) {
    console.warn("refund without orderMerchantExternalId", d.orderId);
    return;
  }
  /* 投流订单：置 cancelled + 清置顶 */
  const { data: promo } = await admin.from("promo_orders").select("*").eq("id", localId).maybeSingle();
  if (promo) {
    await admin.from("promo_orders").update({ status: "cancelled", featured_until: null }).eq("id", localId);
    await admin.from("square_posts").update({ featured_until: null }).eq("id", promo.post_id);
    return;
  }
  /* 订阅：置 cancelled（权益按 T&C 退款政策处理） */
  await admin.from("subscriptions").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", localId);
}
