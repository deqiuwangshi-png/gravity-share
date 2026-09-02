/**
 * 富文本内容工具（2026-08-29，TipTap 富文本内容；2026-09-02 P0-1 XSS 加固）
 * 发布/编辑存 HTML（TipTap getHTML 输出），渲染前必须 sanitize 防 XSS；
 * 2026-09-02：DOMPurify → isomorphic-dompurify（Node 端自动走 jsdom）——
 *   原实现 SSR 分支直接 return html（净化只在浏览器端），绕过 UI 直写 PostgREST 的
 *   恶意 HTML 会在服务端渲染时原样输出（Stored XSS，审计 P0-1）。现在服务端同样净化。
 * 存量纯文本（无标签）isRichText=false，走原文本渲染，无需迁移。
 * 渲染端链接（2026-08-29）：sanitizeHtmlForRender 把外部链接 href 改写为 /go 安全网关
 *   （白名单直跳 / 未知确认页 / 黑名单拦截 + url_audit 审计）——与纯文本路径 LinkifiedText 行为一致；
 *   服务端净化生效后，SSR 首帧的外链同样走 /go（此前 SSR 直出原始外链）。
 */
import DOMPurify from "isomorphic-dompurify";
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
 * isomorphic-dompurify 在服务端（SSR/无 window）同样执行净化——不再有"SSR 返回原值"裸奔分支（审计 P0-1）。
 * 注意：不改写链接（存储保持原始 URL，编辑表单/数据兼容不受影响）。 */
export function sanitizeHtml(html: string): string {
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
 * 用模块级标志只在本函数执行期间生效——写库主防线 sanitizeHtml 不受影响（存储保持原文）。
 * 服务端（SSR）同样注册 hook：SSR 首帧外链即走 /go（此前服务端分支不执行，链接原样输出）。 */
let renderRelayLinks = false;
let relayHookRegistered = false;

function ensureRelayHook() {
  if (relayHookRegistered) return;
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

/** 提取富文本正文中的 <img> src 列表（按出现顺序、去重）
 * 用于编辑场景把存量图预载进图集条；输入为已 sanitize 的受控 HTML，src 为简单 URL，正则足够。
 * 返回完整公开 URL（与存储 content 中的 img src 一致），交由 pathFromPublicUrl 反解 storage path。 */
export function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const src = m[1];
    if (src && !urls.includes(src)) urls.push(src);
  }
  return urls;
}

/** 移除富文本正文中的全部 <img> 标签（037 图集化：图片统一进 gallery，正文纯文字）
 * 保存前调用（先 sanitize 再剥离，保证剥离对象是受控 HTML）；其余标签原样保留。
 * TipTap getHTML 输出 `<img src="…">`（无自闭合），正则同时兼容 `<img … />`。 */
export function stripImages(html: string): string {
  return html.replace(/<img[^>]*>/gi, "");
}
