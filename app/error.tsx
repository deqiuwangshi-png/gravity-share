"use client";

/**
 * 根错误边界（C5）：未处理渲染错误兜底 + 重试
 * Next.js 要求根 error.tsx 自带 <html>/<body>（替换整个布局）
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error; /* Next 契约签名（digest 用于上报），当前仅展示兜底 UI */
  return (
    <html lang="zh-CN">
      <body>
        <div className="error-fallback" role="alert">
          <h1>页面出错了</h1>
          <p>加载过程中发生错误，请稍后重试。</p>
          <button type="button" onClick={() => reset()}>重试</button>
        </div>
      </body>
    </html>
  );
}
