/**
 * URL 安全策略（2026-08-23 安全加固 V4）——「不信任用户输入」的外链入库前标准化
 * 纯函数（无网络/DNS），供发布链路与展示层复用：
 * - 协议白名单：仅 http/https
 * - 拒绝：userinfo（user:pass@）、裸 IP / 内网保留段、localhost、非标准端口、超长
 * - 域名解析（DNS）校验留待未来发布 API 化时服务端完成（避免纯函数内做网络调用）
 * 返回规范化 href；不合法返回 null（调用方决定忽略或提示）
 */

/** 私网 / 保留段 IPv4 前缀（CIDR 前两段匹配即可覆盖本项目场景） */
const PRIVATE_V4 = [
  "10.", "192.168.", "127.", "0.", "169.254.", "172.16.", "172.17.", "172.18.", "172.19.",
  "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.",
  "172.28.", "172.29.", "172.30.", "172.31.", "100.64.", "198.18.", "198.19.",
];

const MAX_URL_LENGTH = 2048;

/** IPv4 字面量正则（简单判定，不做精确段校验——命中即按「字面量 IP」拒绝） */
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
/** IPv6 字面量（含 [::1] 带括号形态由 URL.hostname 去括号后判断） */
const IPV6_RE = /^[0-9a-fA-F:]+$/;

function isPrivateLiteral(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (IPV4_RE.test(lower)) {
    return PRIVATE_V4.some((prefix) => lower.startsWith(prefix));
  }
  /* IPv6：全部拒绝（::1 内网；公网 IPv6 字面量在 MVP 同样不鼓励直链） */
  if (IPV6_RE.test(lower)) return true;
  return false;
}

/**
 * 外链入库前标准化：
 * - 无协议补 https://（用户常填 www.xxx.com）
 * - 仅 http/https；拒绝 userinfo / 字面量 IP 或内网 host / localhost / 非标准端口 / 超长
 * 合法 → 返回规范化 href；非法 → null
 */
export function sanitizeUrl(raw: string): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  const host = parsed.hostname;
  if (!host || isPrivateLiteral(host)) return null;
  if (parsed.username || parsed.password) return null;
  /* 端口：仅允许无端口（默认）/ 80 / 443（防内网端口探测与异常服务） */
  const port = parsed.port;
  if (port && port !== "80" && port !== "443") return null;

  return parsed.href;
}
