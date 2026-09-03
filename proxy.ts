/**
 * 根目录守卫（Next 16 proxy.ts，替代 middleware）
 * 规则（2026-08-25 SEO：D1 公开只读已确认，/square /categories /profile 对游客/爬虫开放）：
 *   (app) 应用路由 → /home（应用主页=私人工作台）需登录，未登录跳 /login
 *   (auth) 认证路由（/login /register /forgot-password）→ 已登录跳 /home
 *   (marketing) 落地页与法律页 → 公开
 *   (app) 公开只读区（/square /categories /profile）→ 游客可看（爬虫可收录）
 * 同时负责刷新 Supabase session cookie（@supabase/ssr 官方模式）
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** 需登录的应用路由前缀（SEO 公开化后仅剩应用主页；/discover/[id] 已 301 到 /square/[id]，无需守卫） */
const APP_PREFIXES = ["/home"];

/** 精确路径需登录（2026-08-25 SEO：/profile 自己主页需登录，/profile/[id] 他人主页公开不受影响；2026-09-03 /promo /boost 商业化页已删） */
const APP_EXACT_PATHS = ["/profile"];

/** 认证路由前缀（route group (auth)） */
const AUTH_PREFIXES = ["/login", "/register", "/forgot-password"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  /* 校验并刷新会话 */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const needsAuth =
    APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    APP_EXACT_PATHS.includes(pathname);
  const isAuthPage = AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
