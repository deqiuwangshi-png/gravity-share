/**
 * 加载态（2026-09-03 P0 抽取）——统一全站散写的"加载中…"
 * 默认样式对齐历史散写点（px-[18px] py-12 text-center text-[13px] text-soft）
 */
import { cn } from "@/lib/cn";

export function LoadingState({
  message = "加载中…",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <p className={cn("px-[18px] py-12 text-center text-[13px] text-soft", className)}>
      {message}
    </p>
  );
}
