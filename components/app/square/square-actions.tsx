/**
 * 广场详情互动条（client）：点赞 toggle + 浏览量展示（mock）
 */
"use client";

import { useState } from "react";

export function SquareActions({ likes, views }: { likes: number; views: number }) {
  const [liked, setLiked] = useState(false);
  const count = likes + (liked ? 1 : 0);

  return (
    <div className="square-actions">
      <button
        type="button"
        className={`square-like${liked ? " active" : ""}`}
        onClick={() => setLiked(!liked)}
        aria-pressed={liked}
      >{liked ? "已赞" : "赞"} {count}</button>
      <span className="square-views">浏览 {views}</span>
    </div>
  );
}
