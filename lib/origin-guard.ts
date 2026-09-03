/**
 * 同源请求守卫（2026-09-02，安全升级 R2 批 A）
 * 背景：6 个带 Cookie 认证的状态变更 Route Handler 此前无 Origin/CSRF 校验，仅依赖 SameSite=Lax
 * （浏览器默认已挡跨站 POST；残留同源 XSS / 子域 / Cookie Domain 放宽的窄面）。
 * 本 helper 对非 GET/HEAD/OPTIONS 请求校验 Origin（缺省回退 Referer）是否为本站同源：
 *   生产：仅放行 SITE_URL（单一来源 lib/seo.ts，env NEXT_PUBLIC_SITE_URL）同源 origin，
 *         可经服务端 env ALLOWED_ORIGINS（逗号分隔）追加额外来源（如 Vercel Preview 域名）；
 *   开发（NODE_ENV !== production）：放行本机回环 localhost / 127.0.0.1 任意端口，便于换端口 dev。
 * fail closed：头缺失 / 解析失败 / 不在白名单 → 403，不静默放行。
 * 边界：外部服务回调（无浏览器 Origin、自带签名验签的 webhook）不接入本守卫。
 */
import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/seo";

/** 请求声称的站点 origin（Origin 头优先，缺省回退 Referer；缺失/非法返回 null） */
function claimedOrigin(request: Request): string | null {
  const raw = request.headers.get("origin") ?? request.headers.get("referer");
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/** 是否放行该 origin */
function isAllowed(origin: string): boolean {
  /* 开发环境：本机回环任意端口（3000/3001…），不比对端口避免换端口 dev 被误伤 */
  if (process.env.NODE_ENV !== "production") {
    const hostname = new URL(origin).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  }
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(SITE_URL).origin);
  } catch {
    /* SITE_URL 非法时按空白名单处理（fail closed） */
  }
  for (const raw of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      allowed.add(new URL(trimmed).origin);
    } catch {
      /* 忽略非法条目 */
    }
  }
  return allowed.has(origin);
}

/** 校验请求同源；通过返回 null，拒绝返回 403 响应（调用方直接 return 即可） */
export function assertSameOrigin(request: Request): NextResponse | null {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;
  const origin = claimedOrigin(request);
  if (!origin || !isAllowed(origin)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
