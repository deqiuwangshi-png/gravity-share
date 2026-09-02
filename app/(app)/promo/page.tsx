/**
 * 订阅管理页（client，2026-08-30 重写：混合页 → 纯订阅管理）
 * 结构：我的订阅状态条 → 套餐三卡（免费/专业/团队，月/年切换）→ 支付区（订阅/续费/取消）
 * 真实链路：insert subscriptions（触发器置 pending）→ /api/pay/checkout → 跳 Waffo 收银台
 * 支付通道未配置时 checkout 返回 503「支付通道准备中」，页面原样展示，密钥补齐即通
 * 单次投放已拆至 /boost（2026-08-30 用户确认分离）
 * 订阅价格真相源在 Waffo 商品，本页价格为展示缓存（lib/config.ts SUBSCRIPTION_PLANS）
 * 2026-08-31：早期项目暂不开放订阅 → 页面进入「即将开放」占位（SUBSCRIPTION_OPEN = false）
 *   占位期间下方完整逻辑（状态条 / 三卡 / 支付区）原样保留，改回 true 即完整恢复，零重写成本
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SUBSCRIPTION_PLANS, type SubscriptionCycle } from "@/lib/config";
import {
  fetchMySubscription,
  createSubscription,
  type SubscriptionRow,
} from "@/lib/queries-billing";
import { useToast } from "@/components/app/common/toast";

type PlanId = "free" | "pro" | "team";

const FREE_PLAN = {
  id: "free",
  name: "免费版",
  price: 0,
  features: ["发布 / 发现 / 分享", "内容参与", "基础统计"],
  highlight: false,
} as const;

/** 订阅状态展示文案 */
function subscriptionStatus(sub: SubscriptionRow | null): {
  kind: "none" | "active" | "pending" | "ended" | "past_due";
  text: string;
} {
  if (!sub) return { kind: "none", text: "尚未订阅，选择套餐开始" };
  if (sub.status === "active") {
    const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
    if (end && end.getTime() > Date.now()) {
      const planName = SUBSCRIPTION_PLANS[sub.plan].name;
      const label = sub.cycle === "year" ? "年付" : "月付";
      return { kind: "active", text: `${planName} ${label} · 生效至 ${end.toLocaleDateString()}，到期自动续费` };
    }
    return { kind: "ended", text: "订阅已到期，可重新订阅" };
  }
  if (sub.status === "pending") {
    return { kind: "pending", text: "待支付：请在 15 分钟内完成付款，超时自动取消；也可直接取消该订单重新选择" };
  }
  if (sub.status === "past_due") {
    return { kind: "past_due", text: "续费扣款失败（欠费），请及时处理" };
  }
  return { kind: "ended", text: "订阅已取消，可重新订阅" };
}

/**
 * 订阅开放开关（2026-08-31：早期项目暂不开放订阅，页面转入「即将开放」占位）
 * 恢复方式：改为 true —— 下方完整订阅逻辑一行未删，无需重写
 */
const SUBSCRIPTION_OPEN: boolean = false;

export default function PromoPage() {
  return SUBSCRIPTION_OPEN ? <PromoMain /> : <PromoClosed />;
}

/** 订阅未开放时的占位视图（引导至已可用的内容投流，保留未来期待） */
function PromoClosed() {
  return (
    <div className="app-content promo-page">
      <header className="mb-4 flex flex-wrap items-baseline gap-x-3">
        <h1 className="m-0 text-2xl tracking-[-0.5px]">订阅计划</h1>
        <p className="m-0 text-[13px] text-muted">订阅功能即将开放；发现与分享永久免费。</p>
      </header>
      <section className="promo-soon">
        <b>即将开放</b>
        <p>会员订阅（专业版 / 团队版）正在接入支付能力，开放时间与价格会在本页提前公示。</p>
        <p>现在就能用：把好东西分享出去，让更多人看见——分享始终是平台免费的展示与传播能力。</p>
      </section>
    </div>
  );
}

/** 订阅开放后的完整视图（2026-08-31 起暂时不渲染，逻辑保留待启用） */
function PromoMain() {
  const { show } = useToast();

  const [selected, setSelected] = useState<PlanId>("pro");
  const [cycle, setCycle] = useState<SubscriptionCycle>("month");
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      /* 033 激活：页面进入时先清理超时（>15 分钟）的 pending 单，避免卡死 */
      await supabase.rpc("cancel_stale_payments");
      const mine = await fetchMySubscription(supabase);
      if (cancelled) return;
      setSub(mine);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const status = subscriptionStatus(sub);
  const plan = selected === "free" ? FREE_PLAN : SUBSCRIPTION_PLANS[selected];
  /* 价格索引走 SUBSCRIPTION_PLANS，避免 FREE_PLAN 无 monthly/yearly 的类型问题 */
  const price =
    selected === "free" ? 0 : SUBSCRIPTION_PLANS[selected][cycle === "month" ? "monthly" : "yearly"];
  const canSubscribe = selected !== "free" && status.kind !== "pending" && status.kind !== "active";

  /** 订阅 / 续费：建单 → 跳收银台 */
  async function handleSubscribe() {
    if (busy || selected === "free") return;
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        show("请先登录", "danger");
        return;
      }
      const order = await createSubscription(supabase, user.id, selected as "pro" | "team", cycle);
      const res = await fetch("/api/pay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "sub", orderId: order.id }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) {
        show(data.error ?? "下单失败，请重试", "danger");
        /* 触发器可能已插入 pending 单：重新拉取订阅状态 */
        const mine = await fetchMySubscription(createClient());
        setSub(mine);
        return;
      }
      /* 官方强制：收银台新标签页打开（禁止 location.href），保留本站页面状态 */
      window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      show(err instanceof Error ? err.message : "下单失败，请重试", "danger");
    } finally {
      setBusy(false);
    }
  }

  /** 取消订阅：/api/pay/cancel（Waffo 侧停止续费 + 本地置 cancelled） */
  async function handleCancel() {
    if (busy || !sub) return;
    setBusy(true);
    try {
      const res = await fetch("/api/pay/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: sub.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        show(data.error ?? "取消失败，请稍后重试", "danger");
        return;
      }
      show("已取消，当前周期内权益保留至到期");
      const mine = await fetchMySubscription(createClient());
      setSub(mine);
    } catch {
      show("取消失败，请稍后重试", "danger");
    } finally {
      setBusy(false);
    }
  }

  /** 取消待支付订单（036 RPC：立即取消本人 pending 单，不等 15 分钟超时） */
  async function handleCancelPending() {
    if (busy || !sub) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("cancel_my_pending", { p_kind: "sub", p_id: sub.id });
      if (error) {
        show("取消失败，请重试", "danger");
        return;
      }
      show("已取消该待支付订单，可重新订阅");
      const mine = await fetchMySubscription(supabase);
      setSub(mine);
    } catch {
      show("取消失败，请重试", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-content promo-page">
      <header className="mb-4 flex flex-wrap items-baseline gap-x-3">
        <h1 className="m-0 text-2xl tracking-[-0.5px]">订阅计划</h1>
        <p className="m-0 text-[13px] text-muted">订阅解锁更多分发与增长能力；单次内容投放请前往 <Link className="legal-link" href="/boost">内容投流</Link></p>
      </header>

      {/* ---------- 我的订阅状态条 ---------- */}
      <section className="sub-status" aria-live="polite">
        <b>{loaded ? status.text : "加载中…"}</b>
        {loaded && status.kind === "active" && sub && (
          <button
            type="button"
            className="sub-status-cancel"
            disabled={busy}
            onClick={() => void handleCancel()}
          >
            {busy ? "处理中…" : "取消订阅"}
          </button>
        )}
        {loaded && status.kind === "pending" && sub && (
          <button
            type="button"
            className="sub-status-cancel"
            disabled={busy}
            onClick={() => void handleCancelPending()}
          >
            {busy ? "处理中…" : "取消订单"}
          </button>
        )}
      </section>

      {/* ---------- 月 / 年切换 ---------- */}
      <div className="cycle-toggle" role="tablist" aria-label="计费周期">
        <button type="button" role="tab" aria-selected={cycle === "month"} className={cycle === "month" ? "active" : ""} onClick={() => setCycle("month")}>
          按月付
        </button>
        <button type="button" role="tab" aria-selected={cycle === "year"} className={cycle === "year" ? "active" : ""} onClick={() => setCycle("year")}>
          按年付 · 省 2 个月
        </button>
      </div>

      {/* ---------- 套餐三卡 ---------- */}
      <div className="plans-grid plans-grid-3" role="tablist" aria-label="订阅计划选择">
        <button
          type="button"
          role="tab"
          aria-selected={selected === FREE_PLAN.id}
          className={`plans-card${selected === FREE_PLAN.id ? " active" : ""}`}
          onClick={() => setSelected(FREE_PLAN.id)}
        >
          <div className="plans-card-head"><b>{FREE_PLAN.name}</b></div>
          <p className="plans-price">¥0<small>永久免费</small></p>
          <ul className="plans-features">{FREE_PLAN.features.map((f) => <li key={f}>{f}</li>)}</ul>
        </button>

        {(Object.keys(SUBSCRIPTION_PLANS) as Array<"pro" | "team">).map((id) => {
          const p = SUBSCRIPTION_PLANS[id];
          const p2 = cycle === "month" ? p.monthly : p.yearly;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected === id}
              className={`plans-card${selected === id ? " active" : ""}${p.highlight ? " highlight" : ""}`}
              onClick={() => setSelected(id)}
            >
              <div className="plans-card-head">
                <b>{p.name}</b>
                {p.highlight && <span className="plans-badge">推荐</span>}
              </div>
              <p className="plans-price">
                ¥{p2}
                <small>{cycle === "month" ? "每月" : `每年（${p.monthly * 12 - p.yearly} 元优惠）`}</small>
              </p>
              <ul className="plans-features">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            </button>
          );
        })}
      </div>

      {/* ---------- 支付区 ---------- */}
      <section className="plans-pay" aria-live="polite">
        {selected === "free" ? (
          <p className="plans-pay-free">免费版功能永久开放，无需付费。升级可解锁展示位折扣与更多权益。</p>
        ) : (
          <div className="plans-pay-info">
            <p className="plans-pay-price">
              {cycle === "month" ? `¥${price}/月` : `¥${price}/年`}
            </p>
            <p className="plans-pay-desc">
              {status.kind === "active" ? "订阅已生效，续费将在到期后自动进行（由 Waffo 收银台管理）。" : `订阅后立即可用：${plan.features.join("、")}。`}
              订阅期间内容投放享 8 折。
            </p>
            <p className="plans-agreements">
              点击订阅即表示同意
              <Link href="/terms">《用户协议》</Link>
              <Link href="/privacy">《隐私政策》</Link>
              <span>《自动续费服务协议》（订阅按所选周期自动续费，可随时取消）</span>
            </p>
            {status.kind === "active" ? (
              <p className="plans-pay-desc">如需停止续费，请使用上方「取消订阅」。</p>
            ) : (
              <button className="plans-submit" type="button" disabled={busy || !canSubscribe} onClick={() => void handleSubscribe()}>
                {busy ? "处理中…" : status.kind === "pending" ? "已有待支付订单" : "订阅"}
              </button>
            )}
          </div>
        )}
      </section>

      {/* 分享展示说明（免费传播能力，无佣金承诺） */}
      <div className="promo-share-note">
        不想花钱？把喜欢的资源分享出去，让更多人看见——分享是平台免费的展示与传播能力。单次内容投放见 <Link className="legal-link" href="/boost">内容投流</Link>。
      </div>
    </div>
  );
}
