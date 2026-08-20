/**
 * 全局类型（一个文件装下，别多开目录）
 */

/** 一条"发现"内容（营销页与 app 首页共用同一数据源） */
export interface DiscoveryItem {
  /** 内容类型，如「开发工具」「知识产品」 */
  type: string;
  title: string;
  description: string;
  /** 纯来源名称，展示前缀由页面负责（如「推荐自：」） */
  source: string;
  tags: string[];
  /** 商业推广内容标记 */
  commercial?: boolean;
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
