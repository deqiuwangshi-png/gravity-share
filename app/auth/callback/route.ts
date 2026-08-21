/**
 * OAuth 回调（GitHub 登录）：交换 code → session cookie（@supabase/ssr 官方模式）
 * 流程：Supabase 授权回调 → 本路由 → exchangeCodeForSession → 302 回源（?next= 白名单外回 /home）
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      /* 回源地址白名单（同登录 next 规则）：/ 开头、非 //、无反斜杠 */
      const next =
        nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.includes("\\")
          ? nextParam
          : "/home";
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
