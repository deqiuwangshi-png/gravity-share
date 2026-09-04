import { hostOf, safeHref } from "@/lib/links";
import { URL_PATTERN } from "@/lib/text";
import { sanitizeUrl } from "@/lib/url-policy";

export type ExternalLink = {
  url: string;
  href: string;
  host: string;
};

function toExternalLink(raw: string): ExternalLink | null {
  const url = sanitizeUrl(raw);
  if (!url) return null;
  const href = safeHref(url);
  if (!href) return null;
  return { url, href, host: hostOf(url) };
}

function uniqueLinks(links: ExternalLink[]): ExternalLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}

/** 从纯文本中提取规范化外链，按出现顺序去重。 */
export function extractPlainTextLinks(text: string): ExternalLink[] {
  const pattern = new RegExp(URL_PATTERN.source, "g");
  const matches = text.match(pattern) ?? [];
  return uniqueLinks(matches.flatMap((match) => {
    const link = toExternalLink(match);
    return link ? [link] : [];
  }));
}

/** 合并正文链接和独立 url 字段，规范化后去重。 */
export function mergeExternalLinks(...groups: (ExternalLink[] | string | null | undefined)[]): ExternalLink[] {
  const links = groups.flatMap((group) => {
    if (typeof group === "string") {
      const link = toExternalLink(group);
      return link ? [link] : [];
    }
    return group ?? [];
  });
  return uniqueLinks(links);
}

/** 将一个富文本外链转成卡片数据；非法 URL 不进入卡片。 */
export function externalLinkFromHref(href: string): ExternalLink | null {
  return toExternalLink(href);
}
