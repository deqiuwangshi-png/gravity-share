import { describe, expect, it } from "vitest";
import {
  extractImageUrls,
  sanitizeHtml,
  sanitizeHtmlForRender,
  stripImages,
} from "@/lib/rich-content";

describe("extractImageUrls（提取正文 <img> src）", () => {
  it("按出现顺序提取并去重", () => {
    const html =
      '<p>a</p><p><img src="https://x/s1.png"></p><p><img src="https://x/s2.png"></p><p><img src="https://x/s1.png"></p>';
    expect(extractImageUrls(html)).toEqual(["https://x/s1.png", "https://x/s2.png"]);
  });

  it("兼容自闭合 <img />", () => {
    expect(extractImageUrls('<p><img src="https://x/a.jpg" /></p>')).toEqual(["https://x/a.jpg"]);
  });

  it("无图返回空数组", () => {
    expect(extractImageUrls("<p>hi</p><p><a href=\"https://x\">link</a></p>")).toEqual([]);
  });
});

describe("stripImages（剥离正文全部 <img>，037 图集化）", () => {
  it("移除全部 img 标签，其余标签原样保留", () => {
    const html = '<p>hi</p><p><img src="https://x/s1.png"></p><p><strong>b</strong></p>';
    expect(stripImages(html)).toBe("<p>hi</p><p></p><p><strong>b</strong></p>");
  });

  it("兼容自闭合 <img />", () => {
    expect(stripImages('<p><img src="https://x/a.jpg" /></p>')).toBe("<p></p>");
  });

  it("无图时原样返回", () => {
    const html = "<p>hi</p><p><a href=\"https://x\">link</a></p>";
    expect(stripImages(html)).toBe(html);
  });
});

/* ---------- 2026-09-02 sanitize 测试补强（换 sanitize-html 后首次覆盖；P0-1 XSS 防线回归） ---------- */

describe("sanitizeHtml（入库主防线：白名单剥离 XSS 载荷，不改写链接）", () => {
  it("剥离 script（连同内容）与事件属性", () => {
    const dirty = '<p onclick="alert(1)">hi</p><script>window.x=1</script>';
    expect(sanitizeHtml(dirty)).toBe("<p>hi</p>");
  });

  it("剥离 img 事件属性但保留 https src", () => {
    const dirty = '<img src="https://x/a.png" onerror="alert(1)">';
    const out = sanitizeHtml(dirty);
    expect(out).toContain('<img');
    expect(out).toContain('src="https://x/a.png"');
    expect(out).not.toContain("onerror");
  });

  it("剥除 javascript: href（scheme 白名单）", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
  });

  it("入库不改写外部链接（存储保持原始 URL）", () => {
    const html = '<a href="https://example.com/a?b=1" target="_blank">link</a>';
    const out = sanitizeHtml(html);
    expect(out).toContain('href="https://example.com/a?b=1"');
    /* 对齐 DOMPurify 默认：target=_blank 自动补 rel */
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("白名单外标签剥除但保留文本", () => {
    expect(sanitizeHtml("<div>hello</div>")).toBe("hello");
  });

  it("协议相对链接剥除（allowProtocolRelative:false，安全收紧）", () => {
    expect(sanitizeHtml('<a href="//evil.com/x">x</a>')).toBe("<a>x</a>");
  });
});

describe("sanitizeHtmlForRender（渲染端：白名单 + 外链改写 /go，SSR 首帧同规则）", () => {
  it("外部链接改写为 /go 网关", () => {
    const out = sanitizeHtmlForRender('<p><a href="https://example.com/a?b=1">link</a></p>');
    expect(out).toContain('<a');
    expect(out).toContain('href="/go?url=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1"');
    expect(out).toContain(">link</a>");
  });

  it("站内相对路径不改写", () => {
    const html = '<a href="/square/abc">x</a>';
    expect(sanitizeHtmlForRender(html)).toBe(html);
  });

  it("target=_blank 补 rel，且改写后站内路径二次清洗幂等", () => {
    const once = sanitizeHtmlForRender('<a href="https://x.com" target="_blank">x</a>');
    expect(once).toContain('href="/go?url=');
    expect(once).toContain('rel="noopener noreferrer"');
    expect(sanitizeHtmlForRender(once)).toBe(once);
  });
});
