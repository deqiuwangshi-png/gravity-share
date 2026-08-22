/**
 * 外链跳转操作（client）：确认页「继续访问」（新标签打开，用户确认）+「返回」兜底
 * 全屏闸门页专用，无壳层布局
 */
"use client";

import { useRouter } from "next/navigation";

export function GoActions({ url }: { url: string }) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else router.replace("/home");
  }

  return (
    <div className="go-actions">
      <a className="go-continue" href={url} target="_blank" rel="noopener noreferrer">继续访问</a>
      <button className="go-back" type="button" onClick={goBack}>返回</button>
    </div>
  );
}
