/**
 * 列表加载失败态（2026-09-03 P0 抽取，原 components/app/common/load-error.tsx 收编）
 * 视觉与迁移前逐类一致（含重试按钮样式，未强行套 Button——其描边 primary 色为特例形态）
 * load-error.tsx 保留为兼容转发导出，调用方（square-feed / notification-drawer）import 零扰动
 */
import { cn } from "@/lib/utils";

export function ErrorState({
  onRetry,
  message = "加载失败，请检查网络后重试",
  className,
}: {
  onRetry: () => void;
  message?: string;
  className?: string;
}) {
  return (
    <p className={cn("px-[18px] py-12 text-center text-[13px] text-soft", className)} role="alert">
      {message}
      <button
        type="button"
        className="ml-[10px] cursor-pointer rounded-full border border-line bg-surface px-3 py-[3px] text-[13px] text-primary transition-[background-color,border-color] duration-[180ms] hover:border-primary hover:bg-primary-subtle"
        onClick={onRetry}
      >
        重试
      </button>
    </p>
  );
}
