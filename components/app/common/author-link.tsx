/**
 * 作者名可点（跳他人主页 /profile/[id]，client）
 * 两种模式（P0-4，2026-08-31）：
 *   link=true  → 真 <a href>（详情页等非嵌套场景，SEO/AI crawler 可沿链接发现作者）
 *   link=false → span + router.push（卡片默认：外层已是 <a>，避免嵌套链接）
 * 点击/回车跳转，stopPropagation 防止触发外层卡片跳详情。
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function AuthorLink({
  authorId,
  name,
  link = false,
}: {
  authorId: string;
  name: string;
  /** true = 渲染 <a href>（详情页）；默认 span + JS（卡片防嵌套链接） */
  link?: boolean;
}) {
  const router = useRouter();

  if (!authorId) return <>{name}</>;

  /* P0-4 真链接模式：详情页作者名可被搜索引擎直接抓取 */
  if (link) {
    return (
      <Link className="author-link" href={`/profile/${authorId}`}>
        {name}
      </Link>
    );
  }

  function go() {
    router.push(`/profile/${authorId}`);
  }

  return (
    <span
      role="link"
      tabIndex={0}
      className="author-link"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        go();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          go();
        }
      }}
    >
      {name}
    </span>
  );
}
