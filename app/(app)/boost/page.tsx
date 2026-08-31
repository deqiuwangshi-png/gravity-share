/**
 * 内容投流页（client，2026-08-30 新建：单次投放独立成页，境内高频小额）
 * 结构：① 选择帖子 → ② 金额输入 + 实时预览（五档映射）→ ③ 支付投放 → ④ 我的投放记录
 * 真实链路：insert promo_orders（触发器置 pending + 五档映射 + 订阅折扣）→ /api/pay/checkout → 跳 Waffo 收银台
 * 支付通道未配置时 checkout 返回 503「支付通道准备中」，页面原样展示，密钥补齐即通
 * 支持 ?post=xxx 预选帖子（来自帖子菜单「投放」入口）
 * ⚠ 预览规则与数据库触发器同源：lib/config.ts BOOST_TIERS（改必须同步 034 迁移）
 * 2026-08-31：与订阅同批暂不开放 → 页面进入「即将开放」占位（BOOST_OPEN = false）
 *   占位期间下方完整投流逻辑（选择/预览/支付/记录）原样保留，改回 true 即完整恢复，零重写成本
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BOOST_MIN, boostTierFor } from "@/lib/config";
import {
  createPromoOrder,
  fetchMyPromoOrders,
  type PromoOrderRow,
} from "@/lib/queries-billing";
import { useToast } from "@/components/app/common/toast";

type MyPost = { id: string; content: string; created_at: string };

/** 帖子选择摘要（去富文本标签，截断 24 字） */
function postSummary(content: string): string {
  const text = content.replace(/<[^>]*>/g, "").trim();
  return text.length > 24 ? `${text.slice(0, 24)}…` : text || "（无文字内容）";
}

/** 记录状态样式类（显式映射：check-styles 静态扫描需要字面量类名） */
const STATUS_CLASS = {
  pending: "is-pending",
  active: "is-active",
  ended: "is-ended",
  cancelled: "is-cancelled",
} as const;

/** 记录状态文案 */
function orderStatusLabel(o: PromoOrderRow): { label: string; kind: keyof typeof STATUS_CLASS } {
  if (o.status === "pending") return { label: "待支付", kind: "pending" };
  if (o.status === "cancelled") return { label: "已取消", kind: "cancelled" };
  if (o.status === "paid") {
    const end = o.featured_until ? new Date(o.featured_until) : null;
    if (end && end.getTime() > Date.now()) {
      return { label: `展示中 · 至 ${end.toLocaleDateString()}`, kind: "active" };
    }
    return { label: "已结束", kind: "ended" };
  }
  return { label: o.status, kind: "ended" };
}

/**
 * 内容投流开放开关（2026-08-31：早期项目暂不开放，页面转入「即将开放」占位）
 * 恢复方式：改为 true —— 下方完整投流逻辑一行未删，无需重写
 */
const BOOST_OPEN: boolean = false;

export default function BoostPage() {
  return BOOST_OPEN ? <BoostMain /> : <BoostClosed />;
}

/** 内容投流未开放时的占位视图（与订阅同批下线，等支付链路跑通再开放） */
function BoostClosed() {
  return (
    <div className="app-content promo-page">
      <header className="feed-head">
        <h1>内容投流</h1>
        <p>内容投流即将开放；发现与分享永久免费。</p>
      </header>
      <section className="promo-soon">
        <b>即将开放</b>
        <p>内容投流（全服置顶 / 首页横幅）正在接入支付能力，开放时间与档位规则会在本页提前公示。</p>
        <p>现在就能用：把好东西分享出去，让更多人看见——分享始终是平台免费的展示与传播能力。</p>
      </section>
    </div>
  );
}

/** 内容投流开放后的完整视图（2026-08-31 起暂时不渲染，逻辑保留待启用） */
function BoostMain() {
  const { show } = useToast();

  const [posts, setPosts] = useState<MyPost[]>([]);
  const [selectedPost, setSelectedPost] = useState("");
  const [amount, setAmount] = useState("50");
  const [orders, setOrders] = useState<PromoOrderRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      /* 033 激活：页面进入时先清理超时（>15 分钟）的 pending 单 */
      await supabase.rpc("cancel_stale_payments");
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const uid = userData.user.id;

      /* 我的帖子（RLS 公开读） */
      const { data: myPosts } = await supabase
        .from("square_posts")
        .select("id, content, created_at")
        .eq("author_id", uid)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      const list = (myPosts as MyPost[] | null) ?? [];
      setPosts(list);

      /* ?post=xxx 预选（帖子菜单「投放」入口） */
      const preset = new URLSearchParams(window.location.search).get("post");
      setSelectedPost(preset && list.some((p) => p.id === preset) ? preset : (list[0]?.id ?? ""));

      /* 我的投放记录 */
      const mine = await fetchMyPromoOrders(supabase);
      if (!cancelled) setOrders(mine);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const amountInt = Number.parseInt(amount, 10);
  const tier = Number.isInteger(amountInt) && amountInt >= BOOST_MIN ? boostTierFor(amountInt) : null;
  const amountError = amount !== "" && !tier ? `金额需为 ¥${BOOST_MIN} 起的整数` : "";
  const canSubmit = Boolean(selectedPost && tier && !busy);

  const postTitleMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of posts) m.set(p.id, postSummary(p.content));
    return m;
  }, [posts]);

  /** 下单：建单 → 跳收银台 */
  async function handleSubmit() {
    if (!canSubmit || !tier) return;
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
      const order = await createPromoOrder(supabase, user.id, selectedPost, amountInt);
      const res = await fetch("/api/pay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "promo", orderId: order.id }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) {
        show(data.error ?? "下单失败，请重试", "danger");
        /* 订单已 insert（pending）：重新拉取记录列表 */
        const mine = await fetchMyPromoOrders(createClient());
        setOrders(mine);
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

  /** 取消待支付投放单（036 RPC：立即取消本人 pending 单） */
  async function handleCancelOrder(orderId: string) {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("cancel_my_pending", { p_kind: "promo", p_id: orderId });
      if (error) {
        show("取消失败，请重试", "danger");
        return;
      }
      show("已取消该待支付订单");
      const mine = await fetchMyPromoOrders(supabase);
      setOrders(mine);
    } catch {
      show("取消失败，请重试", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-content promo-page">
      <header className="feed-head">
        <h1>内容投流</h1>
        <p>给内容买一次确定的展示（位置 / 时长 / 范围），不承诺点击与收益。会员订阅见 <Link className="legal-link" href="/promo">订阅计划</Link></p>
      </header>

      {/* ---------- ① 选择帖子 ---------- */}
      <section className="promo-card boost-card">
        <h2 className="promo-card-title">① 选择要投放的内容</h2>
        {posts.length === 0 ? (
          <p className="promo-card-desc">你还没有发布内容，先去 <Link className="legal-link" href="/home">首页</Link> 发一条吧。</p>
        ) : (
          <select
            className="boost-post-select"
            value={selectedPost}
            onChange={(e) => setSelectedPost(e.target.value)}
            aria-label="选择帖子"
          >
            {posts.map((p) => (
              <option key={p.id} value={p.id}>{postSummary(p.content)}</option>
            ))}
          </select>
        )}
      </section>

      {/* ---------- ② 金额 + 预览 ---------- */}
      <section className="promo-card boost-card" aria-live="polite">
        <h2 className="promo-card-title">② 输入金额，实时预览</h2>
        <div className="boost-input-row">
          <span className="boost-currency">¥</span>
          <input
            type="number"
            min={BOOST_MIN}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(BOOST_MIN)}
            aria-label="投放金额"
          />
          <span className="boost-hint">最低 ¥{BOOST_MIN} · 展示时长随金额递增</span>
        </div>

        {amountError && <p className="promo-error" role="alert">{amountError}</p>}

        {tier && (
          <div className="boost-preview">
            <span>{tier.label}</span>
            {tier.withBanner && <span className="boost-preview-tag">含横幅</span>}
            <b>¥{amountInt}</b>
          </div>
        )}
        {tier && tier.min >= 500 && (
          <p className="promo-card-desc">企业档：收款后由人工开通，不在支付后自动生效。</p>
        )}
      </section>

      {/* ---------- ③ 支付投放 ---------- */}
      <section className="promo-card boost-card">
        <h2 className="promo-card-title">③ 确认支付</h2>
        <p className="promo-card-desc">
          一次性投放，支付后立即生效。同意
          <Link href="/terms">《用户协议》</Link>
          <Link href="/privacy">《隐私政策》</Link>
          。支付由 Waffo（Merchant of Record）处理，我们不接触你的支付卡信息。
        </p>
        <button
          className="plans-submit boost-submit"
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
        >
          {busy ? "处理中…" : tier ? `支付 ¥${amountInt}` : "输入金额后可支付"}
        </button>
      </section>

      {/* ---------- ④ 我的投放记录 ---------- */}
      <section className="promo-card">
        <h2 className="promo-card-title">我的投放记录</h2>
        {orders.length === 0 ? (
          <p className="promo-card-desc">暂无投放记录。</p>
        ) : (
          <ul className="boost-list">
            {orders.map((o) => {
              const st = orderStatusLabel(o);
              return (
                <li key={o.id} className="boost-list-item">
                  <span className="boost-list-post">{postTitleMap.get(o.post_id) ?? "（帖子）"}</span>
                  <span className="boost-list-meta">
                    ¥{o.price}
                    {o.duration_minutes ? ` · ${Math.round(o.duration_minutes / 60)}h` : ""}
                  </span>
                  <span className={`boost-list-status ${STATUS_CLASS[st.kind]}`}>{st.label}</span>
                  {o.status === "pending" && (
                    <button
                      type="button"
                      className="boost-list-cancel"
                      disabled={busy}
                      onClick={() => void handleCancelOrder(o.id)}
                    >
                      取消
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
