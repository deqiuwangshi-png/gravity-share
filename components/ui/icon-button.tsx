/**
 * 纯图标按钮（2026-09-03 P0 抽取）——弹窗关闭 X / 顶栏铃铛等图标钮统一壳
 * 尺寸不内置（size-7 / size-8 / h-9 w-9 由调用方 className 给）；hover 效果不内置，
 * 需要时由调用方 className 追加（如 hover:text-foreground）——保持与原各消费点视觉一致
 */
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-hover text-muted transition-colors duration-[180ms] [font:inherit] disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
