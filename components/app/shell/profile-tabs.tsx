/**
 * 个人主页胶囊导航（client）：推荐 | 评论
 * 选中项绿色下划线；Tab 切换由父组件 state 控制
 * 2026-08-23 重构：原 发现/推广/广场/收藏 四 tab 统一为「推荐」（我发布的推荐+推广）/
 * 「评论」（我发表过的评论）
 */
"use client";

const PROFILE_TABS = ["推荐", "评论"] as const;
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
