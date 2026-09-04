/**
 * 富文本内容工具（2026-08-29，TipTap 富文本内容；2026-09-02 P0-1 XSS 加固；同日 Vercel 生产 500 修复）
 * 发布/编辑存 HTML（TipTap getHTML 输出），渲染前必须 sanitize 防 XSS；
 * 2026-09-02 两连换：DOMPurify → isomorphic-dompurify → sanitize-html（Vercel SSR 修复）——
 *   isomorphic-dompurify 的 Node 端依赖 jsdom（其依赖链含纯 ESM 包 @exodus/bytes），在 Vercel Serverless
 *   以 external module 运行时 require 时报 ERR_REQUIRE_ESM（全部 SSR 页 500；本地打包环境转译了 ESM 故不触发）。
 *   sanitize-html 为纯 JS 解析器（htmlparser2），无 DOM/jsdom 依赖，Node 端与浏览器端均可安全加载，
 *   双端净化语义一致——服务端净化是 P0-1 Stored XSS 修复的核心（SSR 不可裸奔），绝不回退。
 * 存量纯文本（无标签）isRichText=false，走原文本渲染，无需迁移。
 * 渲染端链接（2026-08-29）：sanitizeHtmlForRender 把外部链接 href 改写为 /go 安全网关
 *   （白名单直跳 / 未知确认页 / 黑名单拦截 + url_audit 审计）——与纯文本路径 LinkifiedText 行为一致；
 *   服务端净化生效后，SSR 首帧的外链同样走 /go（此前 SSR 直出原始外链）。
 */
import sanitize from "sanitize-html";
import { externalLinkFromHref, type ExternalLink } from "@/lib/external-links";
import { safeHref } from "@/lib/links";

/** 白名单清洗（script/事件属性/javascript: URL 等一律剥离；allowedTags/Attributes 白名单 + allowedSchemes 双保险） */
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "s", "u", "code", "pre",
  "h2", "h3", "blockquote", "ul", "ol", "li", "hr", "a", "img", "span",
];

/** 标签 → 允许属性（sanitize-html 按标签分组白名单；未列出的属性全剥） */
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  img: ["src", "alt"],
};

/** 由 sanitize-html 自身类型推导选项类型（避免依赖其 namespace 导出的形态差异） */
type SanitizeOptions = NonNullable<Parameters<typeof sanitize>[1]>;

/**
 * 共享净化选项。
 * @param relayLinks 渲染端置 true：外部 http/https 链接改写为 /go 网关；入库（sanitizeHtml）恒 false 保持存储原文
 * 与旧 DOMPurify 实现的差异（均为安全收紧、富文本编辑器不会产出的形态，无功能损失）：
 * ① allowProtocolRelative:false —— 协议相对 //evil.com 不再放行（旧正则 [^a-z] 分支会放行）
 * ② allowedSchemes 仅 http/https/mailto —— 其它 scheme（tel:/data: 等）一律剥除
 * 对齐 DOMPurify 默认行为：a[target=_blank] 自动补 rel="noopener noreferrer"（浏览器新默认虽已隐式 noopener，双保险保留）
 */
function purifyOptions(relayLinks: boolean, links?: ExternalLink[]): SanitizeOptions {
  return {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href;
        if (href && /^https?:\/\//i.test(href)) {
          if (links) {
            const link = externalLinkFromHref(href);
            if (link) links.push(link);
            return { tagName: "span", attribs: {} };
          }
          if (relayLinks) {
            /* 渲染端：外部链接 → /go 网关；非法（safeHref null）去链 */
            const relay = safeHref(href);
            if (relay) attribs.href = relay;
            else delete attribs.href;
          }
          /* 入库端不改写：存储保持原始 URL（编辑表单/数据兼容不受影响） */
        }
        if (attribs.target === "_blank" && !attribs.rel) {
          attribs.rel = "noopener noreferrer";
        }
        return { tagName, attribs };
      },
    },
  };
}

/** 富文本 → 安全 HTML（白名单剥离 script/事件属性/javascript: URL）
 * 主防线：发布/编辑入库前调用（存储永远干净）；渲染端再次清洗作纵深。
 * 不改写链接（存储保持原始 URL，编辑表单/数据兼容不受影响）。 */
export function sanitizeHtml(html: string): string {
  return sanitize(html, purifyOptions(false));
}

/** 渲染端清洗（RichContent 用）：白名单清洗 + 外部链接改写为 /go 安全网关
 * 改写规则：仅 http/https 外部链接 → /go?url=…（改写后为站内路径，二次清洗幂等）；
 * 站内相对路径 / mailto: / 锚点保留原样（allowedSchemes 已兜底 javascript: 等）；
 * 非法外部 URL 去链（safeHref 返回 null 时）。存储不落改写结果，编辑表单仍显示原始 URL。 */
export function sanitizeHtmlForRender(html: string): string {
  return sanitize(html, purifyOptions(true));
}

/** 渲染富文本并同步抽取外链；外链锚点降级为普通文字，交由底部卡片承载。 */
export function sanitizeHtmlForRenderWithLinks(html: string): { html: string; links: ExternalLink[] } {
  const links: ExternalLink[] = [];
  const safeHtml = sanitize(html, purifyOptions(false, links));
  return { html: safeHtml, links };
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
