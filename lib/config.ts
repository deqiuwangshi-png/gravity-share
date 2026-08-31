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

/** 内容入口·来源平台（选填下拉，post_type='content' 跨平台分发标识） */
export const SOURCE_PLATFORMS = ["微信公众号", "个人博客", "知乎", "CSDN", "掘金", "视频（B站/YouTube 等）", "作品集", "开源项目", "其他"] as const;

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

/* ---------- 计费（2026-08-30，Waffo MoR 接入） ---------- */

/**
 * 订阅方案展示缓存（真相源在 Waffo 后台的商品价格，本表仅用于页面展示）
 * 档位与数据库 subscriptions.plan check 约束严格一致（pro / team，无 basic）
 * 价格单位：人民币元（展示用；Waffo 侧订阅按币种方案另行定价）
 */
export const SUBSCRIPTION_PLANS = {
  pro: {
    name: "专业版",
    monthly: 68,
    yearly: 680,
    features: ["含免费版全部", "展示位 8 折", "高级筛选", "优先客服"],
    highlight: true,
  },
  team: {
    name: "团队版",
    monthly: 128,
    yearly: 1280,
    features: ["含专业版全部", "多账号管理", "团队报表", "专属支持"],
    highlight: false,
  },
} as const;

type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;
export type SubscriptionCycle = "month" | "year";

/**
 * 投流金额 → 确定性分发映射（公开规则，可解释性承诺）
 * ⚠ 必须与 supabase/migrations/034-waffo-billing.sql 的 promo_orders_sanitize 触发器逐字一致，
 * 改这一处必须同步改迁移，否则「前端允许下单、数据库拒绝」或「前端预览与实际不符」
 * 仅由 boostTierFor 内部消费（knip：不导出未使用常量）
 */
export const BOOST_MIN = 20;
const BOOST_TIERS = [
  { min: 20, max: 49, minutes: 360, withBanner: false, label: "全服置顶 6 小时" },
  { min: 50, max: 99, minutes: 720, withBanner: false, label: "全服置顶 12 小时" },
  { min: 100, max: 199, minutes: 1440, withBanner: false, label: "全服置顶 24 小时" },
  { min: 200, max: 499, minutes: 2880, withBanner: true, label: "全服置顶 48 小时 + 首页横幅" },
  { min: 500, max: Number.POSITIVE_INFINITY, minutes: 10080, withBanner: true, label: "企业档 · 收款后人工开通" },
] as const;

export type BoostTier = (typeof BOOST_TIERS)[number];

/** 按金额取档位（未命中返回 null） */
export function boostTierFor(amount: number): BoostTier | null {
  return BOOST_TIERS.find((t) => amount >= t.min && amount <= t.max) ?? null;
}

/* ---------- 第三方广告（2026-08-31，Google AdSense） ---------- */

/**
 * AdSense 发布商 ID（形如 ca-pub-xxxxxxxxxxxxxxxx）
 * 来源：AdSense 后台「广告 → 概览 → 按广告单元」给出的代码
 * 未配置（空串）时全站广告位返回 null，页面零变化——未过审期间不留空白占位
 * 值本身会出现在页面源码里（AdSense 设计如此，非密钥），故走 NEXT_PUBLIC_ 前缀
 */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

/**
 * 广告位单元 ID（按页面分开，便于 AdSense 后台分位置看收益、单独关停某一位）
 * 三项分别对应：首页内容流 / 内容详情页 / 分类页
 * 任一为空 → 该位置不渲染（可只开部分位置）
 */
export const AD_SLOTS = {
  homeFeed: process.env.NEXT_PUBLIC_AD_SLOT_HOME ?? "",
  squareDetail: process.env.NEXT_PUBLIC_AD_SLOT_SQUARE ?? "",
  category: process.env.NEXT_PUBLIC_AD_SLOT_CATEGORY ?? "",
} as const;

/**
 * 首页信息流广告插入间隔（每 N 张内容卡后插入一条广告）
 * 内容不足 N 条时不插广告——内容少时不打扰，也避免「广告多于内容」违规
 */
export const AD_FEED_INTERVAL = 8;
