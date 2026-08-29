/**
 * 富文本内容工具（2026-08-29，TipTap 富文本内容）
 * 发布/编辑存 HTML（TipTap getHTML 输出），渲染前必须 sanitize（DOMPurify 白名单）防 XSS；
 * 存量纯文本（无标签）isRichText=false，走原文本渲染，无需迁移。
 * 渲染端链接（2026-08-29）：sanitizeHtmlForRender 把外部链接 href 改写为 /go 安全网关
 *   （白名单直跳 / 未知确认页 / 黑名单拦截 + url_audit 审计）——与纯文本路径 LinkifiedText 行为一致
 */
import DOMPurify from "dompurify";
import { safeHref } from "@/lib/links";

/** 白名单清洗（DOMPurify 默认已剥离 script/事件属性/javascript: URL；
 * 显式收紧为内容场景常用标签与属性，双保险） */
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "s", "u", "code", "pre",
  "h2", "h3", "blockquote", "ul", "ol", "li", "hr", "a", "img",
];

const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt"];

/** 富文本 → 安全 HTML（DOMPurify 白名单剥离 script/事件属性/javascript: URL）
 * 主防线：发布/编辑入库前调用（存储永远干净）；渲染端再次清洗作纵深。
 * SSR（无 window）直接返回原值——此时内容必已过写库前清洗，安全。
 * 注意：不改写链接（存储保持原始 URL，编辑表单/数据兼容不受影响）。 */
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/** 渲染端清洗（RichContent 用）：白名单清洗 + 外部链接改写为 /go 安全网关
 * 改写规则：仅 http/https 外部链接 → /go?url=…（改写后为站内路径，二次清洗幂等）；
 * 站内相对路径 / mailto: / 锚点保留原样（协议白名单已兜底 javascript: 等）；
 * 非法外部 URL 去链（safeHref 返回 null 时）。存储不落改写结果，编辑表单仍显示原始 URL。
 * 实现：DOMPurify 钩子经 addHook 全局注册（非 sanitize config 项），
 * 用模块级标志只在本函数执行期间生效——写库主防线 sanitizeHtml 不受影响（存储保持原文）。 */
let renderRelayLinks = false;
let relayHookRegistered = false;

function ensureRelayHook() {
  if (relayHookRegistered || typeof window === "undefined") return;
  relayHookRegistered = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (!renderRelayLinks) return;
    if (node.tagName !== "A" || !node.hasAttribute("href")) return;
    const href = node.getAttribute("href") ?? "";
    if (/^https?:\/\//i.test(href)) {
      const relay = safeHref(href);
      if (relay) node.setAttribute("href", relay);
      else node.removeAttribute("href");
    }
  });
}

export function sanitizeHtmlForRender(html: string): string {
  if (typeof window === "undefined") return html;
  ensureRelayHook();
  renderRelayLinks = true;
  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
  } finally {
    renderRelayLinks = false;
  }
}

/** 内容是否含 HTML 标签（存量纯文本为 false） */
export function isRichText(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}
