/**
 * 个人主页胶囊导航（client）：发现 | 推广 | 收藏
 * 选中项绿色下划线；Tab 切换由父组件 state 控制
 * 2026-08-21 「设置」tab 已抽离至下拉菜单「用户设置」面板
 */
"use client";

export const PROFILE_TABS = ["发现", "推广", "收藏"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

export function ProfileTabs({
  active,
  onChange,
}: {
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}) {
  return (
    <nav className="profile-tabs" aria-label="个人主页导航">
      {PROFILE_TABS.map((tab) => (
        <button
          type="button"
          className={`profile-tab${active === tab ? " active" : ""}`}
          key={tab}
          onClick={() => onChange(tab)}
        >{tab}</button>
      ))}
    </nav>
  );
}
