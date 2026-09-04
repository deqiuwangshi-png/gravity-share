import type { Metadata } from "next";
import RegisterForm from "../_components/register-form";

export const metadata: Metadata = {
  title: "注册 | 引力",
  description: "创建引力账号，开始发现和分享。",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
