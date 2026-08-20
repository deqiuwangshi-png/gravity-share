import type { Metadata } from "next";
import AuthForm from "../_components/auth-form";

export const metadata: Metadata = {
  title: "注册 | 引力",
  description: "加入引力，开始分享和发现互联网中的好东西。",
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
