/**
 * 安全跳转页（/go?url=…，2026-08-23）——「离开引力前的一道闸门」
 * - 独立于 (app) 壳层：无侧边栏 / 顶栏 / 搜索框，全屏深色遮罩 + 居中极简白卡片
 * - 低风险（白名单 link_domains）：服务端 redirect 直接跳转，无感
 * - 未知风险：全屏闸门卡「即将离开引力」→ 显示真实域名 → 大按钮 继续访问（新标签）/ 返回
 * - 高风险（黑名单 / 非法 URL）：全屏「已禁止访问」卡，无继续入口
 * - 020 阶段二：白/黑名单迁库（Table Editor 维护）；每次进入记录一条 url_audit（可审计）
 * - 2026-08-25 M5 安全加固：safeRedirectTarget 严格校验（拒 userinfo @ 伪装 / 反斜杠混淆 / 非 http(s)），
 *   确认页展示完整目标地址供核对；展示与跳转共用同一规范化 href，天然保证 host 一致性
 * 开放重定向缓解：仅白名单域名服务端直接跳；未知/高危必须用户确认且展示真实域名
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import "@/styles/app/go.css";
import { riskOf, safeRedirectTarget } from "@/lib/links";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchLinkDomains } from "@/lib/queries-misc";
import { GoActions } from "./go-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "即将离开引力" };

export default async function GoPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url: raw } = await searchParams;
  if (!raw) notFound();

  /* M5 严格校验：协议白名单 + 拒 userinfo/反斜杠，返回规范化 href + host（展示与跳转同源） */
  const target = safeRedirectTarget(raw);
  if (!target.ok) notFound();
  const href = target.href;
  const host = target.host;

  /* 域名信誉库（link_domains，Table Editor 在线维护） */
  const supabase = await createClient();
  const { trusted, blocked } = await fetchLinkDomains(supabase);
  const risk = riskOf(href, trusted, blocked);

  /* 020：跳转审计（每次进入 /go 记一条；service_role 写 url_audit，客户端无权限）
   * 注意：PostgrestBuilder 是 thenable 无 .catch()，用 try/catch；审计失败不阻塞跳转 */
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  try {
    await admin.from("url_audit").insert({
      url: href.slice(0, 2048),
      host: host.slice(0, 253),
      risk,
      user_id: user?.id ?? null,
    });
  } catch {
    /* 审计写入失败不影响跳转 */
  }

  /* 低风险：服务端直接跳转（仅白名单域名，防开放重定向） */
  if (risk === "low") redirect(href);

  return (
    <main className="go-page">
      {risk === "high" ? (
        <div className="go-card">
          <p className="go-kicker">引力安全提示</p>
          <h1>已禁止访问</h1>
          <p className="go-domain">{host}</p>
          <p className="go-url">{href}</p>
          <p className="go-desc">该网站被检测到存在安全风险，平台已阻止访问。</p>
          <Link className="go-continue go-home" href="/home">返回引力</Link>
        </div>
      ) : (
        <div className="go-card">
          <p className="go-kicker">引力安全提示</p>
          <h1>即将离开引力</h1>
          <p className="go-domain">{host}</p>
          <p className="go-url">{href}</p>
          <p className="go-desc">您即将访问外部网站，引力无法保证其内容与安全，请确认目标网址。</p>
          <GoActions url={href} />
        </div>
      )}
    </main>
  );
}
