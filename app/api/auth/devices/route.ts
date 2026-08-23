/**
 * 登录设备管理（GET/DELETE /api/auth/devices，2026-08-23）
 * GET：security definer RPC list_user_sessions（auth.sessions，PostgREST 不暴露 auth schema，见迁移 018）→ 解析 UA 返回设备列表
 * DELETE：撤销指定设备（body { sessionId }）或缺省全部；一律按 uid 绑定本人，无越权面
 * 安全：service_role 仅服务端（lib/supabase/admin.ts）；SameSite cookie 防 CSRF
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SessionRow = {
  id: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

/** UA 解析（内置正则，不引第三方库；识别主流浏览器与系统） */
function parseUA(ua: string): { browser: string; os: string } {
  let browser = "浏览器";
  let os = "未知系统";
  const u = ua.toLowerCase();
  if (u.includes("edg/")) browser = "Edge";
  else if (u.includes("chrome/")) browser = "Chrome";
  else if (u.includes("firefox/")) browser = "Firefox";
  else if (u.includes("safari/")) browser = "Safari";
  else if (u.includes("micromessenger")) browser = "微信内置浏览器";
  else if (u.includes("postman")) browser = "Postman";
  if (u.includes("windows")) os = "Windows";
  else if (u.includes("mac os") || u.includes("macintosh")) os = "macOS";
  else if (u.includes("android")) os = "Android";
  else if (u.includes("iphone") || u.includes("ipad") || u.includes("ios")) os = "iOS";
  else if (u.includes("linux")) os = "Linux";
  return { browser, os };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("list_user_sessions", { uid: user.id });
  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });

  const devices = ((data as SessionRow[] | null) ?? []).map((row) => {
    const { browser, os } = parseUA(row.user_agent ?? "");
    return {
      id: row.id,
      browser,
      os,
      createdAt: row.created_at,
      lastActive: row.updated_at,
    };
  });
  return NextResponse.json({ devices });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId }: { sessionId?: string } = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const { error } = sessionId
    ? await admin.rpc("revoke_user_session", { uid: user.id, sid: sessionId })
    : await admin.rpc("revoke_all_user_sessions", { uid: user.id });
  if (error) return NextResponse.json({ error: "revoke_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
