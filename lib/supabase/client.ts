/**
 * Supabase 浏览器客户端（client 组件用：登录/注册/登出/读会话）
 * 安全：publishable key 设计为浏览器公开；数据安全依赖 RLS 策略
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
