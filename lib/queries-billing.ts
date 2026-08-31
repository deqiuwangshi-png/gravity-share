/**
 * 计费查询层 · 订阅 + 投流（2026-08-30，Waffo MoR 接入）
 * 客户端直连走 RLS：本人 insert / select；update / delete 仅 service_role（服务端路由用 admin 客户端）
 * 建单由数据库触发器定形：status 强制 pending、投流五档映射 + 订阅折扣、归属校验
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** 订单短 id（sub_ / po_ 前缀；与 025 建表注释约定的前端生成一致） */
function makeBillingId(prefix: "sub" | "po"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------- 订阅 ---------- */

export type SubscriptionRow = {
  id: string;
  plan: "pro" | "team";
  status: "pending" | "active" | "cancelled" | "expired" | "past_due";
  cycle: "month" | "year";
  current_period_end: string | null;
  created_at: string;
  external_id: string | null;
};

const SUB_COLUMNS =
  "id, plan, status, cycle, current_period_end, created_at, external_id";

/** 我的订阅（RLS 本人 select；单行每用户，取最新一条） */
export async function fetchMySubscription(
  supabase: SupabaseClient,
): Promise<SubscriptionRow | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select(SUB_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SubscriptionRow | null) ?? null;
}

/**
 * 订阅建单（触发器强制 pending + 校验；返回完整行）
 * 抛错信息直接来自数据库触发器（如「已有生效或待处理的订阅」），页面原样展示
 */
export async function createSubscription(
  supabase: SupabaseClient,
  userId: string,
  plan: "pro" | "team",
  cycle: "month" | "year",
): Promise<SubscriptionRow> {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ id: makeBillingId("sub"), user_id: userId, plan, cycle })
    .select(SUB_COLUMNS)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as SubscriptionRow;
}

/* ---------- 投流 ---------- */

export type PromoOrderRow = {
  id: string;
  post_id: string;
  amount: number;
  price: number;
  duration_minutes: number | null;
  with_banner: boolean;
  status: "pending" | "paid" | "cancelled";
  featured_until: string | null;
  created_at: string;
  external_id: string | null;
};

const PO_COLUMNS =
  "id, post_id, amount, price, duration_minutes, with_banner, status, featured_until, created_at, external_id";

/** 我的投流订单（RLS 本人 select，新单在前） */
export async function fetchMyPromoOrders(
  supabase: SupabaseClient,
): Promise<PromoOrderRow[]> {
  const { data } = await supabase
    .from("promo_orders")
    .select(PO_COLUMNS)
    .order("created_at", { ascending: false });
  return (data as PromoOrderRow[]) ?? [];
}

/** 投流建单（触发器强制 pending + 五档映射 + 折扣 + 归属校验；返回完整行） */
export async function createPromoOrder(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  amount: number,
): Promise<PromoOrderRow> {
  const { data, error } = await supabase
    .from("promo_orders")
    .insert({ id: makeBillingId("po"), user_id: userId, post_id: postId, amount })
    .select(PO_COLUMNS)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as PromoOrderRow;
}
