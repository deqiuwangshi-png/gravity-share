/**
 * 全局类型（一个文件装下，别多开目录）
 */

/** 内容形态（详情页媒体展示，发布时按 URL 后缀自动识别） */
export type DiscoveryKind = "link" | "video" | "doc" | "image";

/** 一条"发现"内容（营销页与 app 首页共用同一数据源） */
export interface DiscoveryItem {
  /** 唯一 id（详情页 /discover/[id] 用） */
  id: string;
  /** 内容类型，如「开发工具」「知识产品」 */
  type: string;
  /** 标题（可选元信息：编辑精选才有；随手写发布不设，卡片/详情页用正文兜底） */
  title?: string;
  /** 内容简介（这个东西的事实描述，预置内容有；发布内容不重复写） */
  description?: string;
  /** 正文（内容本体）——发布时用户写的一段话；卡片显示 note ?? description */
  note: string;
  /** 推荐人昵称（mock：预置内容可空，发布内容必填） */
  author?: string;
  /** 发布时间（相对时间文案，mock） */
  publishTime?: string;
  /** 社会证明（mock 数值）：浏览 / 赞 / 评论 */
  views?: number;
  likes?: number;
  comments?: number;
  /** 纯来源名称，展示前缀由页面负责（如「推荐自：」） */
  source: string;
  tags: string[];
  /** 商业推广内容标记（走入口 B 发布） */
  commercial?: boolean;
  /** 推广类型：返佣 / 订阅分成 / 付费课程 / 积分活动 / 其他（commercial 时） */
  promoType?: string;
  /** 佣金条件说明（commercial 时必填，如「分享得 30% 分佣」） */
  commission?: string;
  /** 原平台外链（点击跳转回流原平台） */
  url?: string;
  /** 来源平台：微信 / 知乎 / CSDN / FlowUs / 个人博客 / 活动 */
  origin?: string;
  /** 内容形态（详情页媒体展示；发布时自动识别，默认 link） */
  kind?: DiscoveryKind;
  /** 媒体直链（图片内容为直链图 URL，详情页内联渲染；视频/文档跳 url 即可可不填） */
  mediaUrl?: string;
}

/** 推荐页内容：在发现内容基础上增加推荐理由 */
export interface RecommendItem extends DiscoveryItem {
  /** 推荐理由，如「因为你看过：AI 编程工具合集」 */
  reason: string;
}

/** 分类总览：一个分类（图标 + 名称 + 内容数） */
export interface CategoryDetail {
  icon: string;
  name: string;
  count: number;
}

/** 站内公告（走马灯）：icon 为图标标识，组件内映射为 SVG */
export interface Announcement {
  icon: "spark" | "gem" | "ring";
  title: string;
  desc: string;
}

/** 已发布内容（发布管理） */
export interface MyPublish {
  title: string;
  type: string;
  status: "published" | "removed";
  date: string;
}

/** 广场帖子（站内交流分享） */
export interface SquarePost {
  id: string;
  author: string;
  content: string;
  tags: string[];
  likes: number;
  comments: number;
  views: number;
  time: string;
  /** 可选外链（解决方案 / 商品 / 服务链接） */
  url?: string;
}

/** 广场评论（详情页评论区） */
export interface SquareComment {
  id: string;
  postId: string;
  author: string;
  content: string;
  time: string;
  likes: number;
}

/** 发现内容评论（发现详情页评论区） */
export interface DiscoveryComment {
  id: string;
  itemId: string;
  author: string;
  content: string;
  time: string;
  likes: number;
}
