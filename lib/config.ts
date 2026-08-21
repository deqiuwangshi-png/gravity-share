/**
 * 全站静态配置（导航、发布类型等）。改配置来这里，不用翻组件。
 */
import { ICONS } from "@/lib/icons";
import { categories } from "@/lib/data";

/** 侧边栏主导航：[图标, 名称, 路由]（首页 / 发现 / 分类 / 广场） */
export const MAIN_NAV = [
  [ICONS.home, "首页", "/home"],
  [ICONS.discover, "发现", "/discover"],
  [ICONS.categories, "分类", "/categories"],
  [ICONS.plaza, "广场", "/square"],
] as const satisfies ReadonlyArray<readonly [string, string, string]>;

/**
 * 发布表单分类（BUG-5 归一：以 categories 为唯一事实源，排除「商业推广」——推广走 B 入口）
 * name 即 discoveries.type 落库值，保证用户发布内容在分类页可达
 */
export const PUBLISH_TYPES = categories
  .filter((cat) => cat.slug !== "promotions")
  .map((cat) => ({ icon: cat.icon, name: cat.name, slug: cat.slug })) as ReadonlyArray<{
  icon: string;
  name: string;
  slug: string;
}>;

/** 来源平台（发布表单下拉） */
export const ORIGIN_PLATFORMS = ["微信", "知乎", "CSDN", "FlowUs", "个人博客", "活动", "其他"] as const;

/** 推广类型（商业发布：返佣 / 分成 / 付费 / 积分 / 其他） */
export const PROMO_TYPES = ["返佣", "订阅分成", "付费课程", "积分活动", "其他"] as const;

/** 广场领域胶囊 · 我的领域（用户已知圈子） */
export const MY_DOMAINS = ["全部", "AI", "开发", "工具"] as const;

/** 广场领域胶囊 · 探索领域（用户未知圈子，打破信息孤岛） */
export const EXPLORE_DOMAINS = ["设计", "教育", "创业"] as const;

/**
 * 站点合规信息（C3：备案占位统一，营销页 footer 与个人主页 aside 共用；
 * 上线前在 Supabase 后台 / 备案完成后替换为真实备案号）
 */
export const SITE_INFO = {
  icp: "ICP备案号待公示",
  police: "公安备案待公示",
  copyright: "© 2026 引力",
} as const;

/**
 * 第三方登录提供商（GitHub / Google 已启用；mark 为社交按钮上的品牌简写）
 * 新增 provider：Dashboard 开对应 Provider 后在此追加一项即可
 */
export const OAUTH_PROVIDERS = [
  { id: "github", label: "GitHub", mark: "GH", enabled: true },
  { id: "google", label: "Google", mark: "G", enabled: true },
] as const;
