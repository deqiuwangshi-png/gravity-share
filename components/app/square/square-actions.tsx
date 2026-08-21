/**
 * 广场详情互动条（client）：点赞 toggle（2c 落库，计数由数据库触发器维护）+ 浏览量展示
 */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isLiked, toggleLike } from "@/lib/queries";

export function SquareActions({ postId, likes, views }: { postId: string; likes: number; views: number }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(likes);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void isLiked(createClient(), "square", postId).then(setLiked);
  }, [postId]);

  async function onToggle() {
    if (busy) return;
    setBusy(true);
    try {
      const next = await toggleLike(createClient(), "square", postId);
      setLiked(next);
      setCount((c) => c + (next ? 1 : -1));
    } catch {
      /* 写失败保持原状态（P1-3 回滚，不再乐观更新计数） */
    }
    setBusy(false);
  }

  return (
    <div className="square-actions">
      <button
        type="button"
        className={`square-like${liked ? " active" : ""}`}
        onClick={() => void onToggle()}
        aria-pressed={liked}
        disabled={busy}
      >{liked ? "已赞" : "赞"} {count}</button>
      <span className="square-views">浏览 {views}</span>
    </div>
  );
}
