import type { ButtonHTMLAttributes } from "react";

/**
 * (auth) 区共享主按钮（2026-09-02 迁移抽离，原 .auth-submit）
 * 纯样式承载，无业务逻辑；水平分布（justify-between / justify-center）由调用方 className 决定——
 * 表单按钮需 justify-between（文案 + → 箭头分两端），弹窗确认按钮传 justify-center。
 * 注意：不带 margin（间距由外层 grid / 容器控制，与 .auth-form 的 gap 语义一致）。
 */
const authSubmitBase =
  "flex h-[46px] w-full items-center rounded-control bg-primary text-on-primary " +
  "text-sm font-bold transition-[background-color,transform] duration-[180ms] " +
  "hover:bg-primary-dark hover:-translate-y-px";

/** 供 Link 场景复用（忘记密码/重置链接的返回按钮是 <Link className=...> 而非 button） */
export const authButtonClass = authSubmitBase;

export function AuthSubmit({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="submit" className={`${authSubmitBase} ${className}`.trim()} {...props} />;
}
