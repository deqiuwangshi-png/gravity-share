/**
 * 全局数据变更事件（S3 拆分 2026-08-29，自 lib/queries.ts 独立）
 * 写库后 dispatch，列表组件监听后重新拉取 / 顶栏铃铛刷新未读红点
 */
/** 内容池变更（发布/评论写库后派发，SquareFeed 等列表组件监听刷新） */
export const SQUARE_UPDATED_EVENT = "square-updated";
export type SquareUpdateDetail = {
	type?: "created" | "updated" | "deleted" | "comment-created";
	postId?: string;
	deletedId?: string;
	authorId?: string;
	category?: string;
};
/** 通知变更（已读/全部已读后派发，顶栏铃铛刷新未读红点） */
export const NOTIFICATION_UPDATED_EVENT = "notification-updated";
