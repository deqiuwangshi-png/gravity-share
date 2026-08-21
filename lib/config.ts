/**
 * 全站静态配置（导航、发布类型等）。改配置来这里，不用翻组件。
 */
import { ICONS } from "@/lib/icons";

/** 侧边栏主导航：[图标, 名称, 路由]（首页 / 发现 / 分类 / 广场） */
export const MAIN_NAV = [
  [ICONS.home, "首页", "/home"],
  [ICONS.discover, "发现", "/discover"],
  [ICONS.categories, "分类", "/categories"],
  [ICONS.plaza, "广场", "/square"],
] as const satisfies ReadonlyArray<readonly [string, string, string]>;

/** 发布弹窗内容类型 */
export const PUBLISH_TYPES = [
  [ICONS.discover, "内容"],
  [ICONS.dev, "工具"],
  [ICONS.knowledge, "课程"],
  [ICONS.design, "作品"],
  [ICONS.tool, "服务"],
  [ICONS.opportunity, "活动 / 机会"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

/** 来源平台（发布表单下拉） */
export const ORIGIN_PLATFORMS = ["微信", "知乎", "CSDN", "FlowUs", "个人博客", "活动", "其他"] as const;

/** 推广类型（商业发布：返佣 / 分成 / 付费 / 积分 / 其他） */
export const PROMO_TYPES = ["返佣", "订阅分成", "付费课程", "积分活动", "其他"] as const;

/** 广场领域胶囊 · 我的领域（用户已知圈子） */
export const MY_DOMAINS = ["全部", "AI", "开发", "工具"] as const;

/** 广场领域胶囊 · 探索领域（用户未知圈子，打破信息孤岛） */
export const EXPLORE_DOMAINS = ["设计", "教育", "创业"] as const;
