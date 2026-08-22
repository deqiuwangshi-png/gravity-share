import { redirect } from "next/navigation";

/**
 * 统一入口（登录即注册）：/register 重定向到 /login
 * 旧链接 / 书签兼容，不再有独立注册页
 */
export default function RegisterPage() {
  redirect("/login");
}
