/**
 * 头像展示（S-1 起）：有存储 path 显示图片（公开 URL），空/加载失败回退首字母
 * className 复用各场景既有头像样式（尺寸/背景由原类控制），img 叠加 avatar-img 保证圆形裁剪
 */
"use client";

import { useState } from "react";
import { publicImageUrl } from "@/lib/storage";

export function AvatarBox({
  path,
  name,
  className,
}: {
  path?: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!path || failed) {
    return <span className={className} aria-hidden="true">{name.charAt(0).toUpperCase()}</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 用户上传图，走公开 URL
    <img
      className={`${className ?? ""} avatar-img`.trim()}
      src={publicImageUrl("avatar", path)}
      alt={name}
      onError={() => setFailed(true)}
    />
  );
}
