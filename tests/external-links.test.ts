import { describe, expect, it } from "vitest";
import {
  extractPlainTextLinks,
  externalLinkFromHref,
  mergeExternalLinks,
} from "@/lib/external-links";
import { sanitizeHtmlForRenderWithLinks } from "@/lib/rich-content";

describe("external-links（正文外链抽取）", () => {
  it("提取纯文本中的多个链接并按规范化 URL 去重", () => {
    const links = extractPlainTextLinks("看 https://example.com 和 https://example.com/ 路线");
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("https://example.com/");
    expect(links[0].href).toContain("/go?url=");
  });

  it("富文本外链变为普通文字并返回卡片数据", () => {
    const result = sanitizeHtmlForRenderWithLinks('<p>访问 <a href="https://example.com/a">官网</a></p>');
    expect(result.html).toBe("<p>访问 <span>官网</span></p>");
    expect(result.links.map((link) => link.host)).toEqual(["example.com"]);
  });

  it("独立 URL 与正文 URL 合并时只保留一张卡片", () => {
    const body = extractPlainTextLinks("https://example.com");
    expect(mergeExternalLinks(body, "https://example.com/")).toHaveLength(1);
  });

  it("危险 URL 不生成卡片", () => {
    expect(externalLinkFromHref("javascript:alert(1)")).toBeNull();
    expect(externalLinkFromHref("http://127.0.0.1/x")).toBeNull();
    expect(externalLinkFromHref("https://user:pass@example.com/x")).toBeNull();
  });
});
