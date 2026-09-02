/**
 * 安全跳转页（/go?url=…，2026-08-23）——「离开引力前的一道闸门」
 * - 独立于 (app) 壳层：无侧边栏 / 顶栏 / 搜索框，全屏深色遮罩 + 居中极简白卡片
 * - 低风险（白名单 link_domains）：服务端 redirect 直接跳转，无感
 * - 未知风险：全屏闸门卡「即将离开引力」→ 显示真实域名 → 大按钮 继续访问（新标签）/ 返回
 * - 高风险（黑名单 / 非法 URL）：全屏「已禁止访问」卡，无继续入口
 * - 020 阶段二：白/黑名单迁库（Table Editor 维护）；每次进入记录一条 url_audit（可审计）
 * - 2026-08-25 M5 安全加固：safeRedirectTarget 严格校验（拒 userinfo @ 伪装 / 反斜杠混淆 / 非 http(s)），
 *   确认页展示完整目标地址供核对；展示与跳转共用同一规范化 href，天然保证 host 一致性
 * - 2026-09-03：样式自 styles/app/go.css 迁 Tailwind（go-card 宿主类保留，大投影收 decor⑩）；
 *   高危「返回引力」按代码注释意图补成大按钮（原 CSS 漏配布局规则，仅主色 inline 文字）
 * 开放重定向缓解：仅白名单域名服务端直接跳；未知/高危必须用户确认且展示真实域名
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
    <main className="grid min-h-screen place-items-center bg-foreground/55 p-[24px_16px] backdrop-blur-[10px]">
      {risk === "high" ? (
        <div className="go-card w-full max-w-[420px] rounded-[18px] bg-surface p-[48px_36px] text-center">
          <p className="mb-[10px] text-[12px] tracking-[0.08em] text-soft">引力安全提示</p>
          <h1 className="mb-[18px] text-[22px] font-semibold text-foreground">已禁止访问</h1>
          <p className="mb-[18px] break-all text-[28px] font-semibold text-primary">{host}</p>
          <p className="-mt-2 mb-[18px] select-text break-all text-[12px] leading-[1.6] text-soft">{href}</p>
          <p className="text-[13px] leading-[1.7] text-muted">该网站被检测到存在安全风险，平台已阻止访问。</p>
          <Link
            className="mt-[30px] inline-flex h-12 items-center justify-center rounded-[12px] bg-primary px-8 text-[15px] font-semibold text-on-primary transition-[background-color] duration-[180ms] hover:bg-primary-dark"
            href="/home"
          >
            返回引力
          </Link>
        </div>
      ) : (
        <div className="go-card w-full max-w-[420px] rounded-[18px] bg-surface p-[48px_36px] text-center">
          <p className="mb-[10px] text-[12px] tracking-[0.08em] text-soft">引力安全提示</p>
          <h1 className="mb-[18px] text-[22px] font-semibold text-foreground">即将离开引力</h1>
          <p className="mb-[18px] break-all text-[28px] font-semibold text-primary">{host}</p>
          <p className="-mt-2 mb-[18px] select-text break-all text-[12px] leading-[1.6] text-soft">{href}</p>
          <p className="text-[13px] leading-[1.7] text-muted">您即将访问外部网站，引力无法保证其内容与安全，请确认目标网址。</p>
          <GoActions url={href} />
        </div>
      )}
    </main>
  );
}
