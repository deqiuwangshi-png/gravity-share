/**
 * 广场话题池（client 内存态）
 * 发布入口 C（话题帖子）追加；刷新还原（mock 边界）。接后端时由 fetch 取代。
 */
import type { SquarePost } from "./types";
import { squarePosts as seed } from "./data";

let posts: SquarePost[] = seed;

/** 当前广场话题流（含本会话新发布的话题） */
export function getSquarePosts(): SquarePost[] {
  return posts;
}

/** 发布一条广场话题（追加到话题流头部） */
export function publishSquarePost(post: SquarePost): void {
  posts = [post, ...posts];
}

/** 话题池更新事件（发布后通知广场重渲染） */
export const SQUARE_UPDATED_EVENT = "square-updated";
