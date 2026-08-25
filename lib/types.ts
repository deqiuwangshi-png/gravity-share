/**
 * 全局类型（一个文件装下，别多开目录）
 */

/** 站内公告（首页走马灯，019 起读库）：kind 决定展示形态，link 可空 */
export interface Announcement {
  id: string;
  /** notice 公告（文字卡）| event 活动 | ad 广告（海报大图卡） */
  kind: "notice" | "event" | "ad";
  /** 文字卡图标（notice 用；海报卡可空） */
  icon?: "spark" | "gem" | "ring";
  title: string;
  desc: string;
  /** 跳转目标：站内路径或外链 http(s)（外链前端走 /go 安全网关） */
  link?: string;
  /** 海报图存储 path（event/ad 用） */
  imageUrl?: string;
}

/* ---------- 2b 数据库 DTO（组件消费形态，author_name 由查询层 join users 填充） ---------- */

/** 用户标识（021 认证体系，对外公开）：none 普通 / official 官方蓝V / discoverer 金牌「发现者」 */
export type UserBadge = "none" | "official" | "discoverer";

/** 广场帖子展示模型（对应 square_posts 表） */
export interface SquarePostDTO {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  /** 作者标识（021：official 蓝V / discoverer 发现者 / none 无） */
  authorBadge?: UserBadge;
  content: string;
  /** 发布类型（2026-08-23 三入口：share 分享 / opportunity 机会 / content 内容） */
  postType: "share" | "opportunity" | "content";
  /** 机会披露（选填，postType=opportunity 合规：佣金/奖励等利益关系） */
  commission?: string;
  /** 内容来源平台（选填，postType=content 跨平台分发标识） */
  sourcePlatform?: string;
  /** 内容分类（固定枚举，发布时落库，与自由 #标签 分离） */
  category: string;
  tags: string[];
  likes: number;
  comments: number;
  views: number;
  time: string;
  /** 原始发布时间（ISO，2026-08-25 SEO 用：Article datePublished / sitemap lastModified） */
  createdAt: string;
  url?: string;
  /** 外链处置状态（020：blocked = 不渲染外链，内容保留） */
  urlStatus?: "normal" | "reported" | "blocked";
  /** 原创配图存储 path（S-1 起，广场详情展示） */
  imageUrl?: string;
}

/* ---------- 公告正文（marketing 区 /notice/[slug]，lib/data.ts 配置渲染） ---------- */

/** 公告正文单篇（配置驱动：新增公告 = data.ts 加一条 + 走马灯插一条数据） */
export interface NoticeArticle {
  /** 路由段：/notice/[slug] */
  slug: string;
  /** 主标题 */
  title: string;
  /** 副标题（可选，如「——引力平台上线公告 · 致每一位创作者」） */
  subtitle?: string;
  /** 发布日期（展示用） */
  date: string;
  /** 署名（如「引力团队」） */
  author: string;
  /** 正文章节 */
  sections: NoticeSection[];
}

/** 公告正文章节（heading h2 / sub h3 / paras 段落支持 **加粗** / list 无序 / ordered 有序 / quote 引用块 / parasAfter 列表或引用后的总结段） */
export interface NoticeSection {
  /** 章节标题（h2，可选：引言类章节可无标题） */
  heading?: string;
  /** 小标题（h3） */
  sub?: string;
  /** 段落（支持 **加粗** 行内标记） */
  paras?: string[];
  /** 无序列表项 */
  list?: string[];
  /** 有序列表项 */
  ordered?: string[];
  /** 引用块（多段：每元素一段 <p>） */
  quote?: string[];
  /** 列表 / 引用块之后的总结段（支持 **加粗**） */
  parasAfter?: string;
}

/** 评论展示模型（对应 comments 表，017 起支持回复一层嵌套） */
export interface CommentDTO {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  /** 作者标识（021） */
  authorBadge?: UserBadge;
  content: string;
  time: string;
  likes: number;
  /** 回复的父评论 id（undefined = 顶层评论） */
  parentId?: string;
}

/** 通知展示模型（对应 notifications 表，2c 起接库） */
export interface NotificationDTO {
  id: string;
  type: string;
  actorName: string;
  title: string;
  content: string;
  time: string;
  read: boolean;
  /** 跳转目标（target_type + item_id 都有才可跳；016 内容池归一后仅 square） */
  targetType?: "square";
  itemId?: string;
}

/** 用户卡片（关注/粉丝列表项，join users） */
export interface UserCardDTO {
  id: string;
  name: string;
  bio: string;
  avatarUrl?: string;
}
