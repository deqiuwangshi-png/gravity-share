/**
 * 清除 recovery 豁免 cookie（POST /api/auth/recovery-clear，2026-09-02 安全升级 R2）
 * reset-form 改密成功后调用：yinli_recovery 为 httpOnly cookie，客户端 JS 无法删除，
 * 必须由服务端 set maxAge=0 清除（成功/退出路径均清理，防豁免残留 30 分钟）。
 * 无副作用：即使被任意调用，也只是清除调用者自己的 recovery 豁免，不构成安全风险，故不要求登录。
 */
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("yinli_recovery", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
