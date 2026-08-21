/**
 * Supabase 服务端客户端（server 组件 / 路由处理器用：cookie 会话）
 * @supabase/ssr 管理 cookie；守卫与「我的账户」读 session 走这里
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component 中调用时由 proxy.ts 刷新 cookie
          }
        },
      },
    },
  );
}
