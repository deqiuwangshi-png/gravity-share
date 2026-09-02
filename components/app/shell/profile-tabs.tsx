/**
 * 个人主页胶囊导航（client）：推荐 | 评论
 * 选中项绿色下划线；Tab 切换由父组件 state 控制
 * 2026-08-23 重构：原 发现/推广/广场/收藏 四 tab 统一为「推荐」（我发布的推荐+推广）/
 * 「评论」（我发表过的评论）
 * 2026-09-02 迁移：profile-tab 系列原子类化（原 styles/app/profile.css）
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
    <nav className="flex gap-1 border-b border-line px-3" aria-label="个人主页导航">
      {PROFILE_TABS.map((tab) => (
        <button
          type="button"
          className={`cursor-pointer border-b-2 bg-transparent px-4 py-[11px] text-[13px] transition-[color] duration-[180ms] hover:text-primary ${
            active === tab
              ? "border-primary font-semibold text-foreground"
              : "border-transparent text-soft"
          }`}
          key={tab}
          onClick={() => onChange(tab)}
        >{tab}</button>
      ))}
    </nav>
  );
}
