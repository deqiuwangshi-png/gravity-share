/**
 * 列表加载失败态（P1-2：加载兜底）：错误提示 + 重试按钮
 * 使用于各 client 列表组件（square-feed / notification-drawer / 详情页评论区）
 * 2026-09-02 P2-home 批次：feed.css 状态段 Tailwind 化
 */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="px-[18px] py-12 text-center text-[13px] text-soft" role="alert">
      加载失败，请检查网络后重试
      <button type="button" className="ml-[10px] cursor-pointer rounded-full border border-line-primary bg-surface px-3 py-[3px] text-[13px] text-primary transition-[background-color,border-color] duration-[180ms] hover:border-primary hover:bg-primary-subtle" onClick={onRetry}>重试</button>
    </p>
  );
}
