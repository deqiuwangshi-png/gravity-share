/**
 * 全站静态配置（导航、发布类型等）。改配置来这里，不用翻组件。
 */
import { ICONS } from "@/lib/icons";

/** 侧边栏主导航：[图标, 名称, 路由]（首页 / 分类；广场已合并进首页，2026-08-27 方案A） */
export const MAIN_NAV = [
  [ICONS.home, "首页", "/home"],
  [ICONS.categories, "分类", "/categories"],
] as const satisfies ReadonlyArray<readonly [string, string, string]>;

/**
 * 广场发布类型（固定枚举，2026-08-23 三入口改版：分享/机会/内容）
 * 与 SQUARE_CATEGORIES（内容领域）是两个维度：post_type 是发布性质，category 是内容领域
 * ⚠ 改此枚举必须同步迁移 015 的 square_posts_post_type_check 约束，否则库与前端漂移
 */
export const SQUARE_POST_TYPES = ["share", "opportunity", "content"] as const;

/**
 * 广场内容分类（固定枚举，2026-08-23：原「我的领域/探索领域」合并为单层内容分类）
 * 分类是内容属性（发布时落库 square_posts.category），不是用户兴趣标签；
 * 「全部」为筛选入口，不在内容分类之列
 * ⚠ 改此枚举必须同步迁移 014 的 square_posts_category_check 约束，否则库与前端漂移
 */
export const SQUARE_CATEGORIES = ["工具", "技术", "行业", "项目", "资源", "作品", "学习", "博客", "交易", "地区", "情感", "其他"] as const;

/**
 * 分类展示元数据（分类页入口卡片，2026-08-23 内容池归一后）：
 * slug 供 /categories/[slug] 路由，icon/desc 供入口卡片展示
 * ⚠ 键名必须与 SQUARE_CATEGORIES 一致；新增分类同步补此表
 */
export const SQUARE_CATEGORY_META: Record<string, { slug: string; icon: string; desc: string }> = {
  工具: { slug: "tools", icon: ICONS.tool, desc: "效率工具与软件服务" },
  技术: { slug: "tech", icon: ICONS.dev, desc: "开发、架构与代码实践" },
  行业: { slug: "industry", icon: ICONS.service, desc: "行业动态与机会" },
  项目: { slug: "projects", icon: ICONS.discover, desc: "可参与的项目与合作" },
  资源: { slug: "resources", icon: ICONS.design, desc: "设计、素材与实用资源" },
  作品: { slug: "works", icon: ICONS.course, desc: "独立创作者的作品" },
  学习: { slug: "learning", icon: ICONS.knowledge, desc: "教程、课程与知识" },
  博客: { slug: "blogs", icon: ICONS.home, desc: "文章与深度内容" },
  交易: { slug: "trading", icon: ICONS.opportunity, desc: "明码标价的推广与合作" },
  地区: { slug: "local", icon: ICONS.plaza, desc: "本地与区域内容" },
  情感: { slug: "feelings", icon: ICONS.categories, desc: "交流与情感话题" },
  其他: { slug: "others", icon: ICONS.search, desc: "不好分类的内容" },
};

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
 * 用户反馈收集（2026-08-23）：飞书多维表格表单公开提交链接（零代码承接反馈）
 * 由用户在飞书创建「用户反馈」多维表格并开启表单分享后提供
 */
export const FEISHU_FEEDBACK_URL =
  "https://my.feishu.cn/share/base/form/shrcnZWcPd0kCajDWj7Z04sdimb";

/**
 * 第三方登录提供商（GitHub / Google 已启用；品牌图标由 auth-form 内联官方 SVG 渲染）
 * 新增 provider：Dashboard 开对应 Provider 后在此追加一项，并在 auth-form 的 ProviderIcon 补充图标
 */
export const OAUTH_PROVIDERS = [
  { id: "github", label: "GitHub", enabled: true },
  { id: "google", label: "Google", enabled: true },
] as const;
