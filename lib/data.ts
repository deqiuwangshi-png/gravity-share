import type { Announcement, Category } from "@/lib/types";
import { ICONS } from "@/lib/icons";

/**
 * 静态数据与配置（mock）——2b 起内容数据已上库、2c 起通知已接库（见 lib/queries.ts），
 * 本文件只保留展示配置。
 */

/** app 首页「热门发现」（右栏） */
export const hotItems = ["2026 值得关注的 AI 工具", "独立开发者资源导航", "免费高质量设计资源"];

/** 营销页搜索热词（带跳转链接） */
export const MARKETING_SEARCH_HINTS = ["AI工具", "开发资源", "知识库", "课程", "设计资源", "创业项目"];

/** 营销页分类展示视图（全名）。分类事实源为 categories，此处为展示文案，不承载分类定义 */
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

/** 右栏探索领域展示视图（短名 + 图标）。分类事实源为 categories，此处为展示别名 */
export const APP_CATEGORIES = [
  [ICONS.discover, "AI"],
  [ICONS.dev, "开发"],
  [ICONS.design, "设计"],
  [ICONS.knowledge, "知识"],
  [ICONS.tool, "工具"],
  [ICONS.course, "课程"],
  [ICONS.service, "服务"],
  [ICONS.opportunity, "机会"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

/* ---------- 公告（走马灯） ---------- */

/** 公告列表（后台可配：替换此数组或改为 fetch 即可，组件零改动） */
export const ANNOUNCEMENTS: Announcement[] = [
  { icon: "spark", title: "引力创作者激励计划", desc: "发布优质外链可获得专属曝光" },
  { icon: "gem", title: "收藏夹功能上线", desc: "把好东西装进自己的口袋" },
  { icon: "ring", title: "社区公约更新", desc: "共建开放、中立、克制的发现社区" },
];

/* ---------- 全部分类页 ---------- */

/**
 * 分类（统一分类源，后台可配）：以 discoveries.type 为事实源
 * 内容数动态计算：fetchDiscoveries().filter(i => i.type === cat.name).length
 */
export const categories: Category[] = [
  { slug: "dev-tools", name: "开发工具", description: "让代码更快的好工具，从脚手架到 Agent", icon: ICONS.dev },
  { slug: "knowledge-products", name: "知识产品", description: "值得付费与收藏的知识服务与内容", icon: ICONS.knowledge },
  { slug: "design-resources", name: "设计资源", description: "界面、图标、素材，设计者的弹药库", icon: ICONS.design },
  { slug: "learning-resources", name: "学习资源", description: "教程与课程，从入门到进阶", icon: ICONS.course },
  { slug: "personal-works", name: "个人作品", description: "独立开发者与创作者的作品集", icon: ICONS.discover },
  { slug: "events", name: "活动与机会", description: "大会、比赛、招募与值得参与的事", icon: ICONS.opportunity },
  { slug: "promotions", name: "商业推广", description: "明码标价的推广与合作（含佣金说明）", icon: ICONS.service },
  { slug: "content", name: "内容", description: "引力社区用户发布的内容", icon: ICONS.tool },
  { slug: "services", name: "服务", description: "软件、订阅与工具服务，长期值得使用的服务", icon: ICONS.service },
];
