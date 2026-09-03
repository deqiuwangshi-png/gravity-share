/**
 * 通用按钮（2026-09-03 P0 抽取）——消灭各业务文件复制按钮类串导致的视觉漂移
 * variant：primary(实底主色) / secondary(描边) / ghost(透明) / danger(实底错误色)
 * size：只统一圆角/字号/基准内边距；高度与宽度不内置，由调用方 className 追加
 *   （如 h-[46px]、w-full、ml-auto）——避免无 tailwind-merge 时同类属性冲突覆盖不可靠
 * 样式全走 globals.css 令牌，无硬编码色值；disabled 统一 opacity-50（边缘态归一，
 *   替代原各处 text-disabled / opacity-60 混用）
 * 约束：禁止在此引入业务逻辑（busy 文案由调用方用 disabled + "处理中…" 自管）
 */
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex shrink-0 cursor-pointer items-center justify-center select-none transition-[background-color,border-color,color] duration-[180ms] [font:inherit] disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-0 bg-primary font-semibold text-on-primary enabled:hover:bg-primary-dark",
  secondary: "border border-line bg-surface text-muted enabled:hover:border-line-primary enabled:hover:text-primary",
  ghost: "border-0 bg-transparent text-foreground enabled:hover:bg-hover",
  danger: "border-0 bg-error font-semibold text-on-error",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "rounded-full px-4 py-[6px] text-xs",
  md: "rounded-full px-5 py-2 text-[13px]",
  lg: "rounded-full px-6 py-[10px] text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
}
