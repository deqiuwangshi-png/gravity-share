/**
 * 发现内容池（client 内存态）
 * 发布后追加条目，当前会话内发现流立即可见；刷新还原（mock 边界）。
 * 接后端时由 fetch 取代，本文件移除。
 */
import type { DiscoveryItem } from "./types";
import { discoveryItems as seed } from "./data";

let items: DiscoveryItem[] = seed;

/** 当前发现流数据（含本次会话新发布的条目） */
export function getDiscoveryItems(): DiscoveryItem[] {
  return items;
}

/** 发布一条发现（追加到内容池头部） */
export function publishDiscoveryItem(item: DiscoveryItem): void {
  items = [item, ...items];
}

/** 内容池更新事件（发布后通知发现流重渲染） */
export const DISCOVERY_UPDATED_EVENT = "discovery-updated";
