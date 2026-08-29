/**
 * 帖子正文渲染统一入口（2026-08-29）：富文本（DOMPurify 白名单清洗 + 外部链接 /go 网关改写后渲染）/ 纯文本（存量或短帖）
 * 富文本走 dangerouslySetInnerHTML 但内容必过 sanitizeHtmlForRender（白名单剥离 script/事件/js: URL + 链接走 /go）
 */
import { isRichText, sanitizeHtmlForRender } from "@/lib/rich-content";
import { LinkifiedText } from "./linkified-text";

export function RichContent({ content }: { content: string }) {
  if (!isRichText(content)) {
    return <LinkifiedText text={content} />;
  }
  return (
    /* eslint-disable-next-line react/no-danger -- 内容已过 DOMPurify 白名单清洗 + /go 改写（lib/rich-content.ts） */
    <div className="rich-content" dangerouslySetInnerHTML={{ __html: sanitizeHtmlForRender(content) }} />
  );
}
