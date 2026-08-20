/**
 * 全站静态配置（导航、发布类型等）。改配置来这里，不用翻组件。
 */

/** 侧边栏「探索」组：[图标, 名称, 路由] */
export const EXPLORE_NAV = [
  ["⌂", "发现", "/home"],
  ["◉", "推荐", "/recommend"],
  ["▦", "全部分类", "/categories"],
] as const satisfies ReadonlyArray<readonly [string, string, string]>;

/** 发布弹窗内容类型 */
export const PUBLISH_TYPES = [
  ["◇", "内容"],
  ["⌘", "工具"],
  ["▤", "课程"],
  ["◈", "作品"],
  ["◎", "服务"],
  ["↗", "活动 / 机会"],
] as const satisfies ReadonlyArray<readonly [string, string]>;
