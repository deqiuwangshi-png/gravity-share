/**
 * 把文本中的 URL 渲染为可点击外链（广场帖子详情用）
 * 安全：仅 URL 片段转为 <a>，其余文本由 React 自动转义
 */
import { URL_PATTERN } from "@/lib/text";

export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);

  return (
    <>
      {parts.map((part, index) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={index}
            className="linkified"
            href={part}
            target="_blank"
            rel="noopener noreferrer"
          >{part}</a>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

/** 文本是否含外链（列表卡片提示「含链接」用） */
export function hasUrl(text: string): boolean {
  return URL_PATTERN.test(text);
}
