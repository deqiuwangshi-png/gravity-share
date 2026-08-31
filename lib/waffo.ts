/**
 * Waffo Pancake 支付配置与客户端（服务端专用，2026-08-30）
 * - waffoConfigured()：密钥是否就绪。未就绪时 /api/pay/checkout 返回友好提示，
 *   页面保持真实链路，密钥补齐后一行不改自动通。
 * - getWaffoClient()：懒加载单例；密钥无效时返回 null（不抛错）。
 * 环境变量：WAFFO_MERCHANT_ID（MER_xxx，不是 Store ID）+ WAFFO_PRIVATE_KEY（RSA PEM，SDK 自动规范化格式）
 * ⚠ 严禁给任何变量加 NEXT_PUBLIC_ 前缀——私钥带该前缀会打进浏览器 bundle
 * ⚠ 测试与生产必须用不同私钥（官方强制）
 * SDK：@waffo/pancake-ts（真实类型；建会话用 checkout.authenticated.create 绑定 buyerIdentity）
 */
import type { WaffoPancake } from "@waffo/pancake-ts";

const MERCHANT_ID = process.env.WAFFO_MERCHANT_ID;
const PRIVATE_KEY = process.env.WAFFO_PRIVATE_KEY ?? process.env.WAFFO_PRIVATE_KEY_BASE64;

export function waffoConfigured(): boolean {
  return Boolean(MERCHANT_ID && PRIVATE_KEY);
}

let _client: WaffoPancake | null | undefined;

export async function getWaffoClient(): Promise<WaffoPancake | null> {
  if (!waffoConfigured()) return null;
  if (_client !== undefined) return _client;
  try {
    const { WaffoPancake: WP } = await import("@waffo/pancake-ts");
    _client = new WP({ merchantId: MERCHANT_ID!, privateKey: PRIVATE_KEY! });
  } catch {
    /* 密钥无效等：置 null，调用方返回友好提示 */
    _client = null;
  }
  return _client;
}

/* ---------- 商品 ID 映射（Waffo 后台创建后填 .env.local） ---------- */

const PRODUCT_IDS = {
  sub_pro_monthly: process.env.WAFFO_PRODUCT_SUB_PRO_MONTHLY,
  sub_pro_yearly: process.env.WAFFO_PRODUCT_SUB_PRO_YEARLY,
  sub_team_monthly: process.env.WAFFO_PRODUCT_SUB_TEAM_MONTHLY,
  sub_team_yearly: process.env.WAFFO_PRODUCT_SUB_TEAM_YEARLY,
  promo: process.env.WAFFO_PRODUCT_PROMO,
} as const;

/** 订阅商品 ID（plan + cycle → PROD_xxx）；未配置返回 null */
export function subscriptionProductId(
  plan: "pro" | "team",
  cycle: "month" | "year",
): string | null {
  const key =
    plan === "pro"
      ? cycle === "month"
        ? "sub_pro_monthly"
        : "sub_pro_yearly"
      : cycle === "month"
        ? "sub_team_monthly"
        : "sub_team_yearly";
  return PRODUCT_IDS[key] ?? null;
}

export function promoProductId(): string | null {
  return PRODUCT_IDS.promo ?? null;
}

/* ---------- 币种（2026-08-30 方案 A：订阅 USD / 投流 CNY） ----------
 * 官方支付矩阵（SDK 注释确认）：一次性 CNY 只支持 wechat（境内高频场景）；
 * 订阅 USD/EUR/GBP/HKD/JPY 支持 card/applepay/googlepay（无 wechat）。
 * 故订阅必须走外币，与「订阅不支持 CNY」的官方限制一致。 */

export const WAFFO_CURRENCY_SUB = process.env.WAFFO_CURRENCY_SUB ?? "USD";
export const WAFFO_CURRENCY_PROMO = process.env.WAFFO_CURRENCY_PROMO ?? "CNY";
