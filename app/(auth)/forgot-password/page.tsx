import type { Metadata } from "next";
import ForgotForm from "../_components/forgot-form";

export const metadata: Metadata = {
  title: "重置密码 | 引力",
  description: "输入注册邮箱，获取密码重置链接。",
};

export default function ForgotPasswordPage() {
  return <ForgotForm />;
}
