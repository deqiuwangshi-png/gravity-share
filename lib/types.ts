/**
 * 全局类型（一个文件装下，别多开目录）
 */

/** 内容形态（详情页媒体展示，发布时按 URL 后缀自动识别） */
export type DiscoveryKind = "link" | "video" | "doc" | "image";

/** 分类：以 discoveries.type 为事实源（内容有什么类型，分类就有什么） */
export interface Category {
  /** URL 用英文 slug，如 开发工具 → dev-tools */
  slug: string;
  /** 分类名（与 discoveries.type 对应） */
  name: string;
  /** 入口卡片一句话描述 */
  description: string;
  /** 图标（复用 ICONS） */
  icon: string;
}

/** 站内公告（走马灯）：icon 为图标标识，组件内映射为 SVG */
export interface Announcement {
  icon: "spark" | "gem" | "ring";
  title: string;
  desc: string;
}

/* ---------- 2b 数据库 DTO（组件消费形态，author_name 由查询层 join users 填充） ---------- */

/** 发现内容展示模型（对应 discoveries 表） */
export interface DiscoveryDTO {
  id: string;
  type: string;
  title?: string;
  note: string;
  description?: string;
  /** 作者用户 id（跳转他人主页用） */
  authorId: string;
  authorName: string;
  /** 作者头像存储 path（S-1 起，空则首字母回退） */
  authorAvatar?: string;
  time: string;
  views: number;
  likes: number;
  comments: number;
  tags: string[];
  source: string;
  origin?: string;
  commercial?: boolean;
  promoType?: string;
  commission?: string;
  url?: string;
  kind: DiscoveryKind;
  mediaUrl?: string;
  /** 推荐位内容才填（/home 推荐理由展示） */
  reason?: string;
}

/** 广场帖子展示模型（对应 square_posts 表） */
export interface SquarePostDTO {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  tags: string[];
  likes: number;
  comments: number;
  views: number;
  time: string;
  url?: string;
  /** 原创配图存储 path（S-1 起，广场详情展示） */
  imageUrl?: string;
}

/** 评论展示模型（对应 comments 表，discovery / square 归一） */
export interface CommentDTO {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  time: string;
  likes: number;
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
  /** 跳转目标（target_type + item_id 都有才可跳） */
  targetType?: "discovery" | "square";
  itemId?: string;
}
