import type { Metadata } from "next";
import AuthForm from "../_components/auth-form";

export const metadata: Metadata = {
  title: "登录引力",
  description: "邮箱或手机号，登录即注册——继续发现和分享值得被看见的好东西。",
};

export default function LoginPage() {
  return <AuthForm />;
}
