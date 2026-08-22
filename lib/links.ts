/**
 * 外链安全分级（2026-08-23）——统一安全跳转页 /go 的风险判定
 * 低风险（知名可信平台）→ 服务端直接跳转；未知风险 → 「即将离开本站」确认页；高风险 → 禁止访问
 * 白/黑名单 MVP 内置静态规则，后续可迁数据库表（trusted_domains / blocked_domains）在线维护
 */

export type LinkRisk = "low" | "unknown" | "high";

/** 高风险黑名单：钓鱼 / 恶意 / 仿冒域名（内置示例，后续迁库表） */
const HIGH_RISK_DOMAINS = new Set([
  "example-evil.com",
  "fake-login.xyz",
  "malware-test.com",
]);

/** 低风险白名单：知名可信平台（子域名自动匹配，如 a.b.github.com → github.com） */
const TRUSTED_DOMAINS = new Set([
  /* 代码托管 */
  "github.com", "github.io", "gitee.com",
  /* 视频 */
  "bilibili.com", "b23.tv", "youtube.com", "youtu.be", "douyin.com",
  /* 内容社区 */
  "zhihu.com", "csdn.net", "juejin.cn", "xiaohongshu.com", "weibo.com",
  /* 电商 */
  "taobao.com", "tmall.com", "jd.com",
  /* 微信 / 腾讯系 */
  "weixin.qq.com", "mp.weixin.qq.com", "qq.com", "tencent.com",
  /* 通用大厂 */
  "baidu.com", "163.com", "aliyun.com", "microsoft.com", "apple.com", "google.com",
  /* 常用效率工具 */
  "flowus.cn", "feishu.cn", "notion.so", "notion.site",
  /* 技术 / 平台 */
  "supabase.com", "vercel.app", "npmjs.com",
  /* seed 演示数据域名（可直接跳，便于联调） */
  "example.com", "picsum.photos",
]);

/** hostname 是否命中集合（逐级匹配子域名：a.b.github.com → github.com） */
function matches(host: string, set: Set<string>): boolean {
  const lower = host.toLowerCase();
  const parts = lower.split(".");
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (set.has(parts.slice(i).join("."))) return true;
  }
  return set.has(lower);
}

/** 风险分级：非法 URL / 黑名单 → high；白名单 → low；其余 → unknown */
export function riskOf(url: string): LinkRisk {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return "high";
  }
  if (matches(host, HIGH_RISK_DOMAINS)) return "high";
  if (matches(host, TRUSTED_DOMAINS)) return "low";
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
