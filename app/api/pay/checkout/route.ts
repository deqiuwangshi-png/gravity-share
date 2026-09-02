/**
 * 支付建单（2026-08-30，Waffo MoR）
 * 订阅与投流共用：客户端先 insert pending 单（RLS 本人）→ 本路由校验归属与状态 → 调 Waffo 建会话 → 返回 checkoutUrl
 * 绑定双保险：buyerIdentity = 我们的 user.id（官方推荐）+ orderMerchantExternalId = 内部订单 id（webhook 据此发放权益）
 * Waffo 密钥未配置时返回 503「支付通道准备中」——页面保持真实链路，密钥补齐即通，无需改页面
 */
import { NextRequest, NextResponse } from "next/server";
import { TaxCategory } from "@waffo/pancake-ts";
import { createClient } from "@/lib/supabase/server";
import { assertSameOrigin } from "@/lib/origin-guard";
import {
  waffoConfigured,
  getWaffoClient,
  subscriptionProductId,
  promoProductId,
  WAFFO_CURRENCY_SUB,
  WAFFO_CURRENCY_PROMO,
} from "@/lib/waffo";

export async function POST(req: NextRequest) {
  /* R2：同源校验（cookie 态状态变更 API 统一防线） */
  const originBlock = assertSameOrigin(req);
  if (originBlock) return originBlock;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: { kind?: "sub" | "promo"; orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const { kind, orderId } = body;
  if ((kind !== "sub" && kind !== "promo") || !orderId) {
    return NextResponse.json({ error: "缺少订单参数" }, { status: 400 });
  }

  /* 校验订单归属与状态（cookie 客户端，RLS 本人 select） */
  const table = kind === "sub" ? "subscriptions" : "promo_orders";
  const { data: order, error: orderError } = await supabase
    .from(table)
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }
  if (order.user_id !== user.id) {
    return NextResponse.json({ error: "无权操作该订单" }, { status: 403 });
  }
  if (order.status !== "pending") {
    return NextResponse.json({ error: "订单状态不可支付" }, { status: 409 });
  }

  /* 支付通道未就绪：返回友好提示（页面展示，密钥补齐即通） */
  if (!waffoConfigured()) {
    return NextResponse.json(
      { error: "支付通道准备中，请稍后再试", code: "NOT_CONFIGURED" },
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
    let session: { checkoutUrl: string };
    if (kind === "sub") {
      const productId = subscriptionProductId(order.plan, order.cycle);
      if (!productId) {
        return NextResponse.json({ error: "订阅商品未配置" }, { status: 500 });
      }
      session = await client.checkout.authenticated.create({
        productId,
        currency: WAFFO_CURRENCY_SUB,
        buyerIdentity: user.id,
        buyerEmail: user.email ?? undefined,
        language: "zh-Hans",
        successUrl: `${req.nextUrl.origin}/promo?paid=1`,
        metadata: { kind: "sub", orderId },
        orderMerchantExternalId: orderId,
      });
    } else {
      const productId = promoProductId();
      if (!productId) {
        return NextResponse.json({ error: "投放商品未配置" }, { status: 500 });
      }
      session = await client.checkout.authenticated.create({
        productId,
        currency: WAFFO_CURRENCY_PROMO,
        buyerIdentity: user.id,
        buyerEmail: user.email ?? undefined,
        language: "zh-Hans",
        successUrl: `${req.nextUrl.origin}/boost?paid=1`,
        metadata: { kind: "promo", orderId },
        orderMerchantExternalId: orderId,
        /* 投流动态定价：以订单实付价（含订阅折扣）为准，覆盖 Waffo 侧商品价 */
        priceSnapshot: { amount: String(order.price), taxCategory: TaxCategory.SaaS },
      });
    }
    return NextResponse.json({ checkoutUrl: session.checkoutUrl });
  } catch (err) {
    console.error("waffo checkout failed", err);
    return NextResponse.json({ error: "创建收银台失败，请稍后重试" }, { status: 502 });
  }
}
