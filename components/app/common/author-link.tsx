/**
 * 作者名可点（跳他人主页 /profile/[id]，client）
 * 用 span 而非 Link：卡片/详情等处外层已是 <a>，避免嵌套链接；
 * 点击/回车跳转，stopPropagation 防止触发外层卡片跳详情。
 */
"use client";

import { useRouter } from "next/navigation";

export function AuthorLink({ authorId, name }: { authorId: string; name: string }) {
  const router = useRouter();

  if (!authorId) return <>{name}</>;

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
