/**
 * 列表加载失败态（P1-2：加载兜底）：错误提示 + 重试按钮
 * 使用于各 client 列表组件（square-feed / notification-drawer / 详情页评论区）
 */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="feed-loading" role="alert">
      加载失败，请检查网络后重试
      <button type="button" className="load-retry" onClick={onRetry}>重试</button>
    </p>
  );
}
