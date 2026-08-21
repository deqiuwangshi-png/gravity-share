import type { Announcement, CategoryDetail, DiscoveryComment, DiscoveryItem, MyPublish, RecommendItem, SquareComment, SquarePost } from "@/lib/types";
import { ICONS } from "@/lib/icons";

/**
 * 全部数据（mock），一个文件集中管理。
 * 接后端为独立阶段（见 ARCHITECTURE.md §8），届时另行设计数据访问层。
 */

/* ---------- 发现内容 ---------- */

/** 完整发现列表（app 首页与发现页消费，10 条铺满 5×2） */
export const discoveryItems: DiscoveryItem[] = [
  { id: "d1", type: "开发工具", title: "AI 编程工具合集", description: "从代码生成到 Agent 开发，覆盖主流 AI 编程工具的完整对比与上手路径。", note: "整理当前值得尝试的 AI 编程工具，都是我实际用下来觉得值得的。", author: "山川", publishTime: "10m", views: 128, likes: 24, comments: 6, tags: ["AI", "编程", "开发者"], source: "开发者社区", origin: "开发者社区", url: "https://example.com/ai-tools", kind: "link" },
  { id: "d2", type: "知识产品", title: "独立开发者知识库", description: "从产品设计、技术开发到增长运营，一套持续更新的独立开发知识库，适合入行与进阶。", note: "从产品设计、技术开发到增长运营都有，内容很扎实，付费后可以一直看更新。", author: "林间", publishTime: "32m", views: 96, likes: 18, comments: 4, tags: ["创业", "产品", "独立开发"], source: "FlowUs", origin: "FlowUs", url: "https://example.com/flowus/indie-base", kind: "doc" },
  { id: "d3", type: "设计资源", title: "高质量 3D 模型资源", description: "面向游戏、产品设计和 3D 打印的模型资源，按风格分类整理，支持原平台直接获取。", note: "找了好久的模型站，质量很高，做产品原型够用了。", author: "晨光", publishTime: "1h", views: 154, likes: 31, comments: 8, tags: ["3D", "模型", "设计"], source: "设计师", origin: "设计师社区", url: "https://example.com/3d-models", kind: "image", mediaUrl: "https://picsum.photos/seed/yinli-3d/800/450" },
  { id: "d4", type: "商业推广", title: "开发者 VPN 推荐", description: "面向开发者和跨境工作的网络服务，稳定且支持多端。", note: "自己用了半年，跨境访问稳定。分享得返佣，介意请绕行。", author: "晚风", publishTime: "2h", views: 210, likes: 12, comments: 15, tags: ["开发者", "网络服务", "推广"], source: "用户推荐", origin: "活动平台", commercial: true, promoType: "返佣", commission: "分享得 10% 返佣", url: "https://example.com/vpn", kind: "link" },
  { id: "d5", type: "学习资源", title: "Python 自动化实战", description: "从基础语法到自动化脚本，一套视频教程，适合希望提高工作效率的学习者。", note: "跟着做完了前几章，批量整理文件的思路很实用。", author: "山岚", publishTime: "3h", views: 87, likes: 15, comments: 3, tags: ["Python", "自动化", "教程"], source: "个人博客", origin: "B 站", url: "https://example.com/python-course", kind: "video" },
  { id: "d6", type: "个人作品", title: "极简 SaaS 产品设计案例", description: "从用户需求、产品结构到视觉设计，完整展示一个 SaaS 产品的设计过程。", note: "作者把完整设计过程公开了，做 B 端产品可以当参考。", author: "拾光", publishTime: "4h", views: 66, likes: 20, comments: 2, tags: ["SaaS", "产品设计", "案例"], source: "个人主页", origin: "个人博客", url: "https://example.com/saas-case", kind: "link" },
  { id: "d7", type: "学习资源", title: "前端性能优化实战手册", description: "从加载策略到渲染路径，覆盖前端性能优化的完整知识地图，附可操作清单。", note: "性能优化能落地的手册不多，这份有清单可以直接照着做。", author: "远山", publishTime: "5h", views: 74, likes: 22, comments: 5, tags: ["前端", "性能", "手册"], source: "技术社区", origin: "掘金", url: "https://example.com/perf-handbook", kind: "doc" },
  { id: "d8", type: "知识产品", title: "产品经理技能地图", description: "从需求分析到数据驱动，一张图理清产品经理的核心能力栈与成长路径。", note: "把 PM 的能力项梳理得很清楚，适合对号入座查缺补漏。", author: "林间", publishTime: "6h", views: 58, likes: 14, comments: 1, tags: ["产品", "方法论", "技能"], source: "产品博客", origin: "个人博客", url: "https://example.com/pm-map", kind: "image", mediaUrl: "https://picsum.photos/seed/yinli-pm/800/450" },
  { id: "d9", type: "活动与机会", title: "2026 独立开发者大会", description: "面向独立开发者的年度聚会：实践分享、工具展区与闭门交流。", note: "去年去过一次，实践分享的质量很高，今年继续组队。", author: "山岚", publishTime: "8h", views: 132, likes: 17, comments: 9, tags: ["活动", "独立开发", "大会"], source: "活动主办方", origin: "活动平台", url: "https://example.com/indie-conf", kind: "link" },
  { id: "d10", type: "设计资源", title: "设计灵感周刊", description: "每周精选高质量界面与品牌设计案例，附拆解思路，给设计师持续输入灵感。", note: "每周更新的设计周刊，拆解思路比纯图库有用。", author: "晨光", publishTime: "12h", views: 45, likes: 9, comments: 0, tags: ["设计", "灵感", "周刊"], source: "设计社区", origin: "设计社区", url: "https://example.com/design-weekly", kind: "link" },
  { id: "d11", type: "开发工具", title: "开源 AI Agent 框架", description: "一个正在快速发展的开源 Agent 框架，支持多工具调用与自定义工作流。", note: "社区活跃，文档也全，跟进学习 AI Agent 开发的好起点。", author: "远山", publishTime: "1d", views: 52, likes: 11, comments: 2, tags: ["AI", "开源", "Agent"], source: "GitHub", origin: "GitHub", url: "https://example.com/agent-framework", kind: "link" },
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

/* ---------- 我的发布（发布管理弹窗） ---------- */

/** 已发布内容（后台可配） */
export const myPublishes: MyPublish[] = [
  { title: "AI 编程工具合集", type: "开发工具", status: "published", date: "2026-08-20" },
  { title: "独立开发者知识库", type: "知识产品", status: "removed", date: "2026-08-15" },
  { title: "高质量 3D 模型资源", type: "设计资源", status: "published", date: "2026-08-10" },
];

/* ---------- 推荐页 ---------- */

/** 推荐内容（后台可配：后续替换为个性化接口返回即可） */
export const recommendItems: RecommendItem[] = [
  { id: "r1", type: "开发工具", title: "2026 值得关注的 AI 工具", note: "从代码生成到 Agent 开发，盘点今年最值得上手的 AI 工具清单。", author: "山川", publishTime: "1h", tags: ["AI", "工具", "盘点"], source: "开发者社区", reason: "你看过：AI 编程工具合集" },
  { id: "r2", type: "知识产品", title: "独立开发产品运营指南", note: "从冷启动到增长，独立开发者做产品运营的完整方法论。", author: "林间", publishTime: "2h", tags: ["创业", "运营", "独立开发"], source: "FlowUs", reason: "你收藏过：独立开发者知识库" },
  { id: "r3", type: "设计资源", title: "游戏开发 3D 模型合集", note: "面向游戏与产品设计的模型资源，按风格分类整理，可直接获取。", author: "晨光", publishTime: "3h", tags: ["3D", "游戏", "模型"], source: "设计师", reason: "你看过：高质量 3D 模型资源" },
  { id: "r4", type: "学习资源", title: "Python 自动化实战", note: "从基础语法到自动化脚本，适合希望提高工作效率的学习者。", author: "山岚", publishTime: "4h", tags: ["Python", "自动化", "教程"], source: "个人博客", reason: "你的兴趣标签：Python" },
  { id: "r5", type: "个人作品", title: "极简 SaaS 产品设计案例", note: "从用户需求、产品结构到视觉设计，完整展示一个 SaaS 产品的设计过程。", author: "拾光", publishTime: "5h", tags: ["SaaS", "产品设计", "案例"], source: "个人主页", reason: "你看过：独立开发产品运营指南" },
  { id: "r6", type: "开发工具", title: "开源 AI Agent 框架", note: "一个正在快速发展的开源 Agent 框架，适合开发者跟进学习。", author: "远山", publishTime: "6h", tags: ["AI", "开源", "Agent"], source: "GitHub", reason: "你关注过：AI 与人工智能" },
];

/* ---------- 全部分类页 ---------- */

/** 分类总览（后台可配） */
export const categoryDetails: CategoryDetail[] = [
  { icon: ICONS.discover, name: "AI", count: 12 },
  { icon: ICONS.dev, name: "开发", count: 8 },
  { icon: ICONS.design, name: "设计", count: 5 },
  { icon: ICONS.knowledge, name: "知识", count: 10 },
  { icon: ICONS.tool, name: "工具", count: 7 },
  { icon: ICONS.course, name: "课程", count: 6 },
  { icon: ICONS.service, name: "服务", count: 4 },
  { icon: ICONS.opportunity, name: "机会", count: 3 },
];

/* ---------- 广场（站内交流分享） ---------- */

/** 广场帖子流（后台可配） */
export const squarePosts: SquarePost[] = [
  { id: "1", author: "山川", content: "整理了一份独立开发者常用的工具清单，从设计、开发到部署全覆盖，分享给大家。工具清单会持续更新，欢迎补充。", tags: ["独立开发", "工具"], likes: 24, comments: 6, views: 128, time: "10 分钟前" },
  { id: "2", author: "林间", content: "最近在学 Python 自动化，发现一个小技巧：用脚本批量整理文件真的能省出大量时间，分享给同样在学自动化的小伙伴。", tags: ["Python", "自动化"], likes: 18, comments: 4, views: 96, time: "32 分钟前" },
  { id: "3", author: "晨光", content: "求推荐好用的设计资源站，最好能免费商用的那种，做产品素材用。目前在看几个素材库，但版权条款看得有点晕。", tags: ["设计", "求助"], likes: 9, comments: 12, views: 63, time: "1 小时前" },
  { id: "4", author: "晚风", content: "把收藏夹彻底整理了一遍，发现真正高频使用的只有不到两成，剩下的都是「以后再说」。整理完有种轻松的释然感。", tags: ["效率", "收藏"], likes: 31, comments: 8, views: 154, time: "2 小时前" },
  { id: "5", author: "山岚", content: "2026 独立开发者大会的报名通道开了，今年有实践分享、工具展区和闭门交流，有一起组队去的吗？", tags: ["活动", "独立开发"], likes: 15, comments: 9, views: 87, time: "3 小时前" },
  { id: "6", author: "山川", content: "我把整理好的独立开发者工具清单发布到发现区了，需要的小伙伴可以直接看：https://yinli.app/d/ai-tools 也欢迎在评论区补充你觉得好用的工具。", tags: ["发现", "工具", "编程"], likes: 12, comments: 3, views: 45, time: "5 分钟前" },
  { id: "7", author: "晨光", content: "想转行做设计，有没有设计圈的朋友分享下从零开始的学习路径？想看看圈外的人是怎么走过来的。", tags: ["设计", "求助"], likes: 8, comments: 5, views: 32, time: "20 分钟前" },
  { id: "8", author: "晚风", content: "在教育行业做了三年在线课程，最近想整理一套公开课的方法论，有同行交流吗？", tags: ["教育", "经验"], likes: 11, comments: 6, views: 58, time: "40 分钟前" },
];

/** 广场评论（后台可配：postId 归属帖子） */
export const squareComments: SquareComment[] = [
  { id: "c1", postId: "1", author: "林间", content: "说得太好了，收藏了。", time: "1 小时前", likes: 3 },
  { id: "c2", postId: "1", author: "晨光", content: "求工具清单的链接，想直接去看。", time: "1 小时前", likes: 2 },
  { id: "c3", postId: "1", author: "晚风", content: "从设计到部署全覆盖，这个整理思路很清晰。", time: "58 分钟前", likes: 5 },
  { id: "c4", postId: "2", author: "山川", content: "批量整理文件这个思路学到了，脚本能分享吗？", time: "20 分钟前", likes: 1 },
  { id: "c5", postId: "2", author: "山岚", content: "同样在学自动化，蹲一个教程。", time: "15 分钟前", likes: 2 },
  { id: "c6", postId: "3", author: "山川", content: "可以看看几个标注了免费商用的素材站，注意看授权条款。", time: "50 分钟前", likes: 4 },
  { id: "c7", postId: "3", author: "晚风", content: "推荐用 CC0 协议的素材，基本没有版权风险。", time: "45 分钟前", likes: 6 },
  { id: "c8", postId: "3", author: "林间", content: "同求，蹲一个整理贴。", time: "30 分钟前", likes: 1 },
  { id: "c9", postId: "4", author: "晨光", content: "「以后再说」太真实了，整理完确实轻松。", time: "1 小时前", likes: 4 },
  { id: "c10", postId: "4", author: "山川", content: "两成是精华，剩下八成是焦虑。", time: "55 分钟前", likes: 7 },
  { id: "c11", postId: "5", author: "晚风", content: "想报名，闭门交流是怎么个形式？", time: "2 小时前", likes: 2 },
  { id: "c12", postId: "5", author: "山川", content: "组队 +1，票已买好。", time: "2 小时前", likes: 3 },
];

/** 按 id 查帖子（详情页用；查不到返回 undefined → 404） */
export function getSquarePost(id: string): SquarePost | undefined {
  return squarePosts.find((post) => post.id === id);
}

/** 按 postId 查评论（详情页评论区） */
export function getSquareComments(postId: string): SquareComment[] {
  return squareComments.filter((comment) => comment.postId === postId);
}

/* ---------- 发现内容评论 ---------- */

/** 发现详情页评论（后台可配） */
export const discoveryComments: DiscoveryComment[] = [
  { id: "dc1", itemId: "d1", author: "林间", content: "Agent 这块整理得不错，正好在调研。", time: "5m", likes: 3 },
  { id: "dc2", itemId: "d1", author: "晚风", content: "有没有免费的替代方案？求补充。", time: "12m", likes: 1 },
  { id: "dc3", itemId: "d2", author: "山川", content: "付费之后更新频率怎么样？", time: "20m", likes: 2 },
  { id: "dc4", itemId: "d2", author: "拾光", content: "内容挺扎实的，适合刚入行的。", time: "40m", likes: 4 },
  { id: "dc5", itemId: "d3", author: "远山", content: "这个模型站分类做得细，收藏了。", time: "30m", likes: 2 },
  { id: "dc6", itemId: "d4", author: "拾光", content: "用了半年，跨境访问确实稳定。", time: "1h", likes: 5 },
  { id: "dc7", itemId: "d5", author: "晨光", content: "跟着做完了前几章，自动化思路很实用。", time: "50m", likes: 3 },
  { id: "dc8", itemId: "d1", author: "山川", content: "感谢补充，工具清单会持续更新，欢迎继续提意见。", time: "now", likes: 2 },
];

/** 按 itemId 查评论（发现详情页评论区） */
export function getDiscoveryComments(itemId: string): DiscoveryComment[] {
  return discoveryComments.filter((comment) => comment.itemId === itemId);
}
