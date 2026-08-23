/**
 * 外链安全分级（2026-08-23 阶段二 V2/V3 改造）——白/黑名单迁库（link_domains 表，Table Editor 在线维护）
 * 分级：trusted（白名单，服务端直跳）/ blocked（黑名单，禁止访问）/ 其余 unknown（确认页）
 * 代码只保留纯函数（可测）；域名数据由 /go 页从库加载传入。
 */

export type LinkRisk = "low" | "unknown" | "high";

/** hostname 是否命中集合（逐级匹配子域名：a.b.github.com → github.com） */
function matchesDomain(host: string, set: Set<string>): boolean {
  const lower = host.toLowerCase();
  const parts = lower.split(".");
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (set.has(parts.slice(i).join("."))) return true;
  }
  return set.has(lower);
}

/** 风险分级：非法 URL / 黑名单 → high；白名单 → low；其余 → unknown（数据来自 link_domains 库表） */
export function riskOf(url: string, trusted: Set<string>, blocked: Set<string>): LinkRisk {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return "high";
  }
  if (matchesDomain(host, blocked)) return "high";
  if (matchesDomain(host, trusted)) return "low";
  return "unknown";
}

/** 生成安全中转链接（/go?url=…）；仅放行 http/https，其余返回 null */
export function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return `/go?url=${encodeURIComponent(parsed.href)}`;
  } catch {
    return null;
  }
}

/** 规范化 URL：补 https:// 前缀（用户可能填 www.xxx.com / xxx.com 无协议格式） */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** 提取域名（卡片链接标记展示用；非法输入回退原文） */
export function hostOf(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname;
  } catch {
    return url;
  }
}
