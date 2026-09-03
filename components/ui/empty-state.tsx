/**
 * 列表空态（2026-09-03 P0 抽取）——统一全站散写的"暂无 xx"提示
 * 只含居中/弱化排版与文案插槽；内边距不内置（各列表留白不同，由调用方 className 给，
 *   如 px-[18px] py-12 / p-[64px_24px]）；可内嵌行动链接/按钮（如"去发布"）
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("text-center text-[13px] text-soft", className)}>{children}</p>;
}
