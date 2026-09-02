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
      /* 重置密码链路豁免标记（R2 2026-09-02）：next=/reset-password 说明来自忘记密码邮件。
       * 原实现种固定值 "1"（弱设计：任何命中该 cookie 的会话都免验旧密码，且不随使用清除）；
       * 现 cookie 值绑定换取到的用户 id，/reset-password 页面同时校验 cookie === 当前 session uid——
       * 仅凭泄漏 cookie（无对应 recovery session）无法获得免密豁免；改密成功后服务端清除（recovery-clear）。 */
      if (nextParam === "/reset-password") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          response.cookies.set("yinli_recovery", user.id, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 1800,
            path: "/",
          });
        }
      }
      return response;
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
