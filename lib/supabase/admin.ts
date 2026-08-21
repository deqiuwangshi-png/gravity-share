/**
 * 服务端管理员客户端（service_role，绕过 RLS）
 * 仅限 server route（如 /api/account/delete）使用——严禁在客户端 import（会泄露密钥）。
 * 密钥来自 .env.local 的 SUPABASE_SERVICE_ROLE_KEY（Dashboard → Project Settings → API → service_role）。
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
