/**
 * 广场详情互动条（client）：点赞 toggle（2c 落库，计数由数据库触发器维护）
 * 2026-09-01 浏览量展示下线（040 清理，MVP 阶段不运营浏览指标）
 */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isLiked, toggleLike } from "@/lib/queries/social";
import { Heart } from "lucide-react";

export function SquareActions({ postId, likes, myId }: { postId: string; likes: number; myId: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(likes);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!myId) return;
    void isLiked(createClient(), postId, myId).then(setLiked);
  }, [myId, postId]);

  async function onToggle() {
    if (busy) return;
    setBusy(true);
    try {
      const next = await toggleLike(createClient(), postId);
      setLiked(next);
      setCount((c) => c + (next ? 1 : -1));
    } catch {
      /* 写失败保持原状态（P1-3 回滚，不再乐观更新计数） */
    }
    setBusy(false);
  }

  return (
    <div className="mt-5 flex items-center gap-[18px] border-y border-line py-[13px]">
      <button
        type="button"
        className={`inline-flex cursor-pointer items-center gap-[5px] border-0 bg-transparent text-[13px] font-medium text-primary transition-[background-color] duration-[180ms] [font:inherit]${liked ? " rounded-full bg-primary-soft px-3 py-[5px]" : ""}`}
        onClick={() => void onToggle()}
        aria-pressed={liked}
        disabled={busy}
      >
        <Heart size={15} />{liked ? "已赞" : "赞"} {count}
      </button>
    </div>
  );
}
