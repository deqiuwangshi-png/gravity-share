/**
 * 应用区路由级加载态（C5）：保留 AppShell，内容区显示加载中
 */
export default function AppLoading() {
  return (
    <div className="app-content">
      <p className="feed-loading">加载中…</p>
    </div>
  );
}
