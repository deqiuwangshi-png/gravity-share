/**
 * 头像展示（S-1 起）：有存储 path 显示图片（公开 URL），空/加载失败回退首字母
 * className 复用各场景既有头像样式（尺寸/背景由原类控制），img 叠加 avatar-img 保证圆形裁剪
 * authorId 可选：传入后整个头像可点击跳转 /profile/[authorId]（与 AuthorLink 行为一致，
 * 修复「点头像无反应只能点名字」的体验问题）；外层为卡片链接时 stopPropagation 防误跳
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { safeAvatarUrl } from "@/lib/storage";

export function AvatarBox({
  path,
  name,
  className,
  authorId,
  badge,
  link = false,
}: {
  path?: string;
  name: string;
  className?: string;
  authorId?: string;
  /** 用户标识（021）：official 时头像加相框描边 */
  badge?: string;
  /** true = 渲染 <a href>（详情页等非嵌套场景，P0-4）；默认 span + JS（卡片防嵌套链接） */
  link?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const frameClass = badge === "official" ? " avatar-official" : "";

  const inner = !path || failed ? (
    <span className={`${className ?? ""}${frameClass}`} aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- 用户上传图，走公开 URL
    <img
      className={`${className ?? ""} avatar-img${frameClass}`.trim()}
      src={safeAvatarUrl(path)}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      /* V6：OAuth 外链头像不向第三方图床泄露 Referer */
      referrerPolicy="no-referrer"
    />
  );

  if (!authorId) return inner;

  /* P0-4 真链接模式：详情页头像可被搜索引擎直接抓取（默认跳转，无嵌套场景无需 preventDefault） */
  if (link) {
    return (
      <Link className="avatar-link" href={`/profile/${authorId}`} aria-label={`查看 ${name} 的主页`}>
        {inner}
      </Link>
    );
  }

  function go(event: React.MouseEvent | React.KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    router.push(`/profile/${authorId}`);
  }

  return (
    <span
      role="link"
      tabIndex={0}
      className="avatar-link"
      aria-label={`查看 ${name} 的主页`}
      onClick={go}
      onKeyDown={(event) => {
        if (event.key === "Enter") go(event);
      }}
    >
      {inner}
    </span>
  );
}
