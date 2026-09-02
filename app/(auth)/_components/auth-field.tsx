import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * (auth) 区共享表单控件（2026-09-02 迁移抽离，原 .auth-form > label / input:not([type=checkbox])）
 * 纯样式承载，无业务逻辑；密码可见性切换结构（.password-field 包裹，见 globals.css）在调用方组合。
 */

/** input 控件类串（44px 高 / 圆角 / 聚焦 ring 用令牌 primary/10；模块内私有，外部用 AuthInput 组件） */
const authInputClass =
  "h-11 w-full rounded-control border border-line bg-surface px-3.5 text-sm text-foreground " +
  "outline-none transition-[border-color,box-shadow] duration-[180ms] " +
  "focus:border-primary focus:ring-[3px] focus:ring-primary/10";

/** 输入框（.password-field 内使用时其 padding-right !important 覆盖生效，见 globals.css） */
export function AuthInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${authInputClass} ${className}`.trim()} {...props} />;
}

/** label 壳：文字标签 + 控件（原 .auth-form > label：grid gap-2 语义） */
export function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-[13px] font-semibold text-muted">
      <span>{label}</span>
      {children}
    </label>
  );
}
