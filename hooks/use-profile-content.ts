/**
 * useProfileContent —— 个人主页内容流 hook（2026-09-03，自 profile-view 抽离——组件职责分层，见 AGENTS.md）
 * 数据态：作者发布的 square_posts（SSR 可预取 initialPosts 作首帧）+ 作者发表的 comments 双列表
 * 刷新：SQUARE_UPDATED_EVENT 事件触发全量重拉（发布/编辑/删除后列表保持新鲜）
 * 供 ProfileView（本人/他人主页共用）消费；组件只保留渲染 + 统计行 myPosts.length
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SQUARE_UPDATED_EVENT } from "@/lib/events";
import { fetchCommentsByAuthor } from "@/lib/queries/comments";
import { fetchSquarePostsByAuthor } from "@/lib/queries/posts";
import type { CommentDTO, SquarePostDTO } from "@/lib/types";

export function useProfileContent(userId: string, initialPosts: SquarePostDTO[] = []) {
  const [myPosts, setMyPosts] = useState<SquarePostDTO[]>(initialPosts);
  const [myComments, setMyComments] = useState<CommentDTO[]>([]);

  const load = useCallback(() => {
    void fetchSquarePostsByAuthor(createClient(), userId).then(setMyPosts).catch(() => { /* 失败保持空态，事件触发再试 */ });
    void fetchCommentsByAuthor(createClient(), userId).then(setMyComments).catch(() => {});
  }, [userId]);

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener(SQUARE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SQUARE_UPDATED_EVENT, onUpdate);
  }, [load]);

  return { myPosts, myComments, load };
}
