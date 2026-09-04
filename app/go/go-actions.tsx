/**
 * 外链跳转操作（client）：确认页「继续访问」（新标签打开，用户确认）+「返回」兜底
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
    <div className="mt-[30px] flex gap-3">
      <a
        className="flex h-12 flex-1 items-center justify-center rounded-[12px] bg-primary text-[15px] font-semibold text-on-primary transition-[background-color] duration-[180ms] hover:bg-primary-dark"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        继续访问
      </a>
      <button
        className="flex h-12 flex-1 cursor-pointer items-center justify-center rounded-[12px] border border-line bg-surface text-[15px] font-semibold text-muted transition-[background-color,border-color,color] duration-[180ms] hover:border-line-primary hover:text-primary [font:inherit]"
        type="button"
        onClick={goBack}
      >
        返回
      </button>
    </div>
  );
}
