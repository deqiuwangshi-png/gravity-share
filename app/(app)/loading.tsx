/**
 * 应用区路由级加载态（C5）：保留 AppShell，内容区显示加载中
 */
export default function AppLoading() {
  return (
    <div className="app-content">
      <p className="px-[18px] py-12 text-center text-[13px] text-soft">加载中…</p>
    </div>
  );
}
