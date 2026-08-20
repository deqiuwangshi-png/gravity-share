import type { CategoryDetail, DiscoveryItem, RecommendItem } from "@/lib/types";

/**
 * 全部数据（mock），一个文件集中管理。
 * 未来接后端时，只需要把这里换成 fetch 调用，页面不用动。
 */

/* ---------- 发现内容 ---------- */

/** 完整发现列表（app 首页消费） */
export const discoveryItems: DiscoveryItem[] = [
  { type: "开发工具", title: "AI 编程工具合集", description: "整理当前值得尝试的 AI 编程工具，从代码生成到 Agent 开发。", tags: ["AI", "编程", "开发者"], source: "开发者社区" },
  { type: "知识产品", title: "独立开发者知识库", description: "从产品设计、技术开发到增长运营，一套持续更新的独立开发知识库。", tags: ["创业", "产品", "独立开发"], source: "FlowUs" },
  { type: "设计资源", title: "高质量 3D 模型资源", description: "面向游戏、产品设计和 3D 打印的模型资源，支持原平台直接获取。", tags: ["3D", "模型", "设计"], source: "设计师" },
  { type: "商业推广", title: "开发者 VPN 推荐", description: "面向开发者和跨境工作的网络服务。推荐成功后发布者可能获得佣金。", tags: ["开发者", "网络服务", "推广"], source: "用户推荐", commercial: true },
  { type: "学习资源", title: "Python 自动化实战", description: "从基础语法到自动化脚本，适合希望提高工作效率的学习者。", tags: ["Python", "自动化", "教程"], source: "个人博客" },
  { type: "个人作品", title: "极简 SaaS 产品设计案例", description: "从用户需求、产品结构到视觉设计，完整展示一个 SaaS 产品的设计过程。", tags: ["SaaS", "产品设计", "案例"], source: "个人主页" },
];

/** 营销页精选（前 3 条），来源前缀由页面加 */
export function getFeaturedDiscoveries(): DiscoveryItem[] {
  return discoveryItems.slice(0, 3);
}

/** app 首页「热门发现」 */
export const hotItems = ["2026 值得关注的 AI 工具", "独立开发者资源导航", "免费高质量设计资源"];

/** app 首页「最近新增」 */
export const newItems = ["一个开源 AI Agent 框架", "游戏开发 3D 模型合集", "独立开发产品运营指南"];

/** 营销页搜索热词（带跳转链接） */
export const MARKETING_SEARCH_HINTS = ["AI工具", "开发资源", "知识库", "课程", "设计资源", "创业项目"];

/* ---------- 分类 ---------- */

/** 营销页分类（全名）。与 APP_CATEGORIES 语义不同，暂不合并。 */
export const MARKETING_CATEGORIES = [
  "AI 与人工智能",
  "开发工具",
  "设计资源",
  "知识与课程",
  "软件与服务",
  "个人作品",
  "活动与机会",
  "其他发现",
] as const;

/** app 首页分类（短名 + 图标）。与 MARKETING_CATEGORIES 语义不同，暂不合并。 */
export const APP_CATEGORIES = [
  ["✦", "AI"],
  ["⌘", "开发"],
  ["◇", "设计"],
  ["▤", "知识"],
  ["◎", "工具"],
  ["▱", "课程"],
  ["◈", "服务"],
  ["↗", "机会"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

/* ---------- 公告（走马灯） ---------- */

/** 站内公告 / 活动：icon 为图标标识（组件内映射为 SVG），title 加粗标题，desc 灰色短语 */
export interface Announcement {
  icon: "spark" | "gem" | "ring";
  title: string;
  desc: string;
}

/** 公告列表（后台可配：替换此数组或改为 fetch 即可，组件零改动） */
export const ANNOUNCEMENTS: Announcement[] = [
  { icon: "spark", title: "引力创作者激励计划", desc: "发布优质外链可获得专属曝光" },
  { icon: "gem", title: "收藏夹功能上线", desc: "把好东西装进自己的口袋" },
  { icon: "ring", title: "社区公约更新", desc: "共建开放、中立、克制的发现社区" },
];

/* ---------- 我的发布（发布管理弹窗） ---------- */

/** 已发布内容（后台可配） */
export interface MyPublish {
  title: string;
  type: string;
  status: "published" | "removed";
  date: string;
}

export const myPublishes: MyPublish[] = [
  { title: "AI 编程工具合集", type: "开发工具", status: "published", date: "2026-08-20" },
  { title: "独立开发者知识库", type: "知识产品", status: "removed", date: "2026-08-15" },
  { title: "高质量 3D 模型资源", type: "设计资源", status: "published", date: "2026-08-10" },
];

/* ---------- 推荐页 ---------- */

/** 推荐内容（后台可配：后续替换为个性化接口返回即可） */
export const recommendItems: RecommendItem[] = [
  { type: "开发工具", title: "2026 值得关注的 AI 工具", description: "从代码生成到 Agent 开发，盘点今年最值得上手的 AI 工具清单。", tags: ["AI", "工具", "盘点"], source: "开发者社区", reason: "你看过：AI 编程工具合集" },
  { type: "知识产品", title: "独立开发产品运营指南", description: "从冷启动到增长，独立开发者做产品运营的完整方法论。", tags: ["创业", "运营", "独立开发"], source: "FlowUs", reason: "你收藏过：独立开发者知识库" },
  { type: "设计资源", title: "游戏开发 3D 模型合集", description: "面向游戏与产品设计的模型资源，按风格分类整理，可直接获取。", tags: ["3D", "游戏", "模型"], source: "设计师", reason: "你看过：高质量 3D 模型资源" },
  { type: "学习资源", title: "Python 自动化实战", description: "从基础语法到自动化脚本，适合希望提高工作效率的学习者。", tags: ["Python", "自动化", "教程"], source: "个人博客", reason: "你的兴趣标签：Python" },
  { type: "个人作品", title: "极简 SaaS 产品设计案例", description: "从用户需求、产品结构到视觉设计，完整展示一个 SaaS 产品的设计过程。", tags: ["SaaS", "产品设计", "案例"], source: "个人主页", reason: "你看过：独立开发产品运营指南" },
  { type: "开发工具", title: "开源 AI Agent 框架", description: "一个正在快速发展的开源 Agent 框架，适合开发者跟进学习。", tags: ["AI", "开源", "Agent"], source: "GitHub", reason: "你关注过：AI 与人工智能" },
];

/* ---------- 全部分类页 ---------- */

/** 分类总览（后台可配） */
export const categoryDetails: CategoryDetail[] = [
  { icon: "✦", name: "AI", count: 12 },
  { icon: "⌘", name: "开发", count: 8 },
  { icon: "◇", name: "设计", count: 5 },
  { icon: "▤", name: "知识", count: 10 },
  { icon: "◎", name: "工具", count: 7 },
  { icon: "▱", name: "课程", count: 6 },
  { icon: "◈", name: "服务", count: 4 },
  { icon: "↗", name: "机会", count: 3 },
];
