/**
 * 安全跳转页（/go?url=…，2026-08-23）——「离开引力前的一道闸门」
 * - 独立于 (app) 壳层：无侧边栏 / 顶栏 / 搜索框，全屏深色遮罩 + 居中极简白卡片
 * - 低风险（白名单）：服务端 redirect 直接跳转，无感
 * - 未知风险：全屏闸门卡「即将离开引力」→ 显示真实域名 → 大按钮 继续访问（新标签）/ 返回
 * - 高风险（黑名单 / 非法 URL）：全屏「已禁止访问」卡，无继续入口
 * 开放重定向缓解：仅白名单域名服务端直接跳；未知/高危必须用户确认且展示真实域名
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import "@/styles/app/go.css";
import { riskOf } from "@/lib/links";
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

  let target: URL;
  try {
    target = new URL(raw);
    if (target.protocol !== "http:" && target.protocol !== "https:") notFound();
  } catch {
    notFound();
  }

  const href = target.href;
  const host = target.hostname;
  const risk = riskOf(href);

  /* 低风险：服务端直接跳转（仅白名单域名，防开放重定向） */
  if (risk === "low") redirect(href);

  return (
    <main className="go-page">
      {risk === "high" ? (
        <div className="go-card">
          <p className="go-kicker">引力安全提示</p>
          <h1>已禁止访问</h1>
          <p className="go-domain">{host}</p>
          <p className="go-desc">该网站被检测到存在安全风险，平台已阻止访问。</p>
          <Link className="go-continue go-home" href="/home">返回引力</Link>
        </div>
      ) : (
        <div className="go-card">
          <p className="go-kicker">引力安全提示</p>
          <h1>即将离开引力</h1>
          <p className="go-domain">{host}</p>
          <p className="go-desc">你将前往第三方网站，平台不控制该网站内容。</p>
          <GoActions url={href} />
        </div>
      )}
    </main>
  );
}
