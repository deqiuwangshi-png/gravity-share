/**
 * OAuth 回调（GitHub 登录）：交换 code → session cookie（@supabase/ssr 官方模式）
 * 流程：Supabase 授权回调 → 本路由 → exchangeCodeForSession → 302 回源（?next= 白名单外回 /home）
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/links";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      /* 回源地址白名单（同登录 next 规则，收敛到 lib/links.ts safeNextPath） */
      const next = safeNextPath(nextParam);
      const response = NextResponse.redirect(`${origin}${next}`);
      /* 重置密码链路标记（2026-08-29）：next=/reset-password 说明来自忘记密码邮件 →
       * 种短时 recovery cookie，/reset-password 据此免验旧密码；
       * 普通会话直访本页则必须验证当前密码（堵账号接管漏洞） */
      if (nextParam === "/reset-password") {
        response.cookies.set("yinli_recovery", "1", {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 1800,
          path: "/",
        });
      }
      return response;
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
