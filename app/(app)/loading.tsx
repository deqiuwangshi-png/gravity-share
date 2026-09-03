/**
 * 应用区路由级加载态（C5）：保留 AppShell，内容区显示加载中
 * 2026-09-03 P3：散写 p → ui/loading-state（样式同源 px-[18px] py-12 text-soft）
 */
import { LoadingState } from "@/components/ui/loading-state";

export default function AppLoading() {
  return (
    <div className="app-content">
      <LoadingState />
    </div>
  );
}
