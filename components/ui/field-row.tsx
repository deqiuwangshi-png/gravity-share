/**
 * 设置表单行骨架（2026-09-03 P3 抽取）——吸收 SettingsPanel / ProfileEditModal 逐字复制的行控件常量
 * 职责仅：行 flex 布局 + 标签位 + 右侧内容插槽 + 行下错误位；divided 控制下分隔线（默认带，末行自动去线）
 * 标签默认 text-foreground；需变色（危险红）时传 labelClassName 覆盖（二选一，不并存双色类）
 * 右侧控件的推右（ml-auto）与自身布局由调用方 children 携带（如 Input ml-auto / 按钮组 flex gap）
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldRow({
  label,
  children,
  error,
  divided = true,
  labelClassName,
  className,
}: {
  label: ReactNode;
  children?: ReactNode;
  error?: ReactNode;
  /** 下分隔线（默认带；行容器已有 border 的场景可关） */
  divided?: boolean;
  /** 覆盖默认前景色（如危险行 text-error）；与默认色互斥不叠加 */
  labelClassName?: string;
  /** 容器类覆写 */
  className?: string;
}) {
  return (
    <>
      <div
        className={cn(
          "flex min-h-[56px] items-center justify-between gap-4 py-4",
          divided && "border-b border-line last:border-0",
          className,
        )}
      >
        <span className={cn("text-[13px]", labelClassName ?? "text-foreground")}>{label}</span>
        {children}
      </div>
      {error ? <p className="-mt-1 mb-2.5 text-xs text-error">{error}</p> : null}
    </>
  );
}
