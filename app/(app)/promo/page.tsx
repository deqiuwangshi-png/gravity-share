/**
 * 订阅计划页（client，2026-08-27 推广中心 → 订阅计划）
 * ① 订阅四卡（免费 / 基础 / 专业 / 团队，选中高亮）→ 订阅支付区随选中版本变化
 * ② 单次投放：自定义金额（¥2-100，2026-08-27 用户确认），实时预览效果 → 一次性支付区
 * 映射规则：时长 = 金额 × 2 小时；强度三档 ¥2-10 单区域加权 / ¥11-50 分类置顶 / ¥51-100 全网置顶
 * 支付均为占位（二维码占位 + 文案样例）；投放生效逻辑（推荐流加权）见 docs/COMMERCIAL-ROADMAP.md 待办
 * 入口：头像菜单 → /promo（proxy 守卫需登录）
 */
"use client";

import { useState } from "react";
import Link from "next/link";

/** 订阅计划档位（占位价格，上线前可改；firstMonth = 首月优惠价，renew = 下次续费日占位） */
const PLANS = [
  { id: "free", name: "免费版", price: 0, tag: "永久免费", renew: "", highlight: false, features: ["发布 / 发现 / 分享", "广场参与", "基础统计"] },
  { id: "basic", name: "基础版", price: 45, firstMonth: 9.9, renew: "2026/09/26", tag: "", highlight: false, features: ["含免费版全部", "投放 9 折", "浏览数据报表"] },
  { id: "pro", name: "专业版", price: 68, firstMonth: 19.9, renew: "2026/09/26", highlight: true, tag: "", features: ["含基础版全部", "展示位 8 折", "高级筛选", "优先客服"] },
  { id: "team", name: "团队版", price: 128, firstMonth: 45, renew: "2026/09/26", tag: "", highlight: false, features: ["含专业版全部", "多账号管理", "团队报表", "专属支持"] },
] as const;

type Plan = (typeof PLANS)[number];

/** 单次投放：自定义金额范围（2026-08-27 用户确认：最低 ¥2 · 上限 ¥100 · 默认 ¥10） */
const BOOST_MIN = 2;
const BOOST_MAX = 100;
const BOOST_DEFAULT = "10";

/** 金额 → 投放效果（时长 = 金额 × 2 小时；强度三档） */
function boostInfo(amount: number): { hours: number; strength: string } {
  const hours = amount * 2;
  const strength = amount <= 10 ? "单区域推荐流加权" : amount <= 50 ? "单区域 + 分类置顶" : "全网加权 + 置顶";
  return { hours, strength };
}

export default function PromoPage() {
  /* 默认选中第一个付费版（支付区默认展示） */
  const [selected, setSelected] = useState<Plan["id"]>("basic");
  const plan = PLANS.find((p) => p.id === selected)!;
  /* 单次投放金额（字符串 state，输入可能为空/非法） */
  const [boostAmount, setBoostAmount] = useState(BOOST_DEFAULT);

  const amount = Number.parseInt(boostAmount, 10);
  const boostValid = Number.isInteger(amount) && amount >= BOOST_MIN && amount <= BOOST_MAX;
  const boost = boostValid ? boostInfo(amount) : null;
  const boostError = !boostValid && boostAmount !== "" ? `金额需在 ¥${BOOST_MIN} ～ ¥${BOOST_MAX} 之间` : "";

  return (
    <div className="app-content promo-page">
      <header className="feed-head">
        <h1>订阅计划</h1>
        <p>选择一个计划，或按需单次投放，解锁更多分发与增长能力</p>
      </header>

      {/* ---------- ① 订阅四卡 ---------- */}
      <div className="plans-grid" role="tablist" aria-label="订阅计划选择">
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={selected === p.id}
            className={`plans-card${selected === p.id ? " active" : ""}${p.highlight ? " highlight" : ""}`}
            onClick={() => setSelected(p.id)}
          >
            <div className="plans-card-head">
              <b>{p.name}</b>
              {p.highlight && <span className="plans-badge">推荐</span>}
            </div>
            <p className="plans-price">
              {p.price === 0 ? "¥0" : `¥${p.price}`}
              <small>{p.tag}</small>
            </p>
            <ul className="plans-features">
              {p.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </button>
        ))}
      </div>

      {/* 订阅支付区（随选中版本变化；免费版无支付） */}
      <section className="plans-pay" aria-live="polite">
        {plan.price === 0 ? (
          <p className="plans-pay-free">免费版功能永久开放，无需付费。</p>
        ) : (
          <>
            <div className="plans-qr">
              <div className="plans-qr-box" aria-label="支付二维码占位">
                <span className="plans-qr-mark">支付二维码</span>
                <span className="plans-qr-sub">支付宝 / 抖音 扫码支付</span>
              </div>
            </div>
            <div className="plans-pay-info">
              <p className="plans-pay-price">¥{plan.firstMonth}</p>
              <p className="plans-pay-desc">
                首月 ¥{plan.firstMonth}/月优惠，之后 ¥{plan.price}/月自动续费，下次续费时间 {plan.renew}，可随时取消
              </p>
              <p className="plans-agreements">
                同意
                <Link href="/terms">《用户协议》</Link>
                <Link href="/privacy">《隐私政策》</Link>
                <span>《引力自动续费服务协议》</span>
              </p>
              <button className="plans-submit" type="button" disabled data-placeholder>扫码支付</button>
            </div>
          </>
        )}
      </section>

      {/* ---------- ② 单次投放（自定义金额） ---------- */}
      <div className="boost-divider"><span>不想订阅？单次投放，¥2 起</span></div>

      <section className="promo-card boost-card" aria-live="polite">
        <h2 className="promo-card-title">单次投放</h2>
        <p className="promo-card-desc">输入金额，实时预览投放效果；一次性支付，立即生效。</p>

        <div className="boost-input-row">
          <span className="boost-currency">¥</span>
          <input
            type="number"
            min={BOOST_MIN}
            max={BOOST_MAX}
            step={1}
            value={boostAmount}
            onChange={(event) => setBoostAmount(event.target.value)}
            placeholder={BOOST_DEFAULT}
            aria-label="投放金额"
          />
          <span className="boost-hint">最低 ¥{BOOST_MIN} · 最高 ¥{BOOST_MAX}</span>
        </div>

        {boostError && <p className="promo-error" role="alert">{boostError}</p>}

        {boost && (
          <>
            <div className="boost-preview">
              <span>{boost.strength}</span>
              <span>{boost.hours} 小时</span>
              <b>¥{amount}</b>
            </div>

            <div className="plans-pay boost-pay">
              <div className="plans-qr">
                <div className="plans-qr-box" aria-label="支付二维码占位">
                  <span className="plans-qr-mark">支付二维码</span>
                  <span className="plans-qr-sub">支付宝 / 抖音 扫码支付</span>
                </div>
              </div>
              <div className="plans-pay-info">
                <p className="plans-pay-price">¥{amount}</p>
                <p className="plans-pay-desc">一次性投放 · {boost.hours} 小时 · {boost.strength}，支付后立即生效</p>
                <p className="plans-agreements">
                  同意 <Link href="/terms">《用户协议》</Link> <Link href="/privacy">《隐私政策》</Link>
                </p>
                <button className="plans-submit" type="button" disabled data-placeholder>扫码支付</button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 分享展示说明（免费传播能力，无佣金承诺） */}
      <div className="promo-share-note">不想花钱？把喜欢的资源分享出去，让更多人看见 —— 分享是平台免费的展示与传播能力，帮你扩大内容触达。</div>
    </div>
  );
}
