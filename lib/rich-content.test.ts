import { describe, expect, it } from "vitest";
import { extractImageUrls, stripImages } from "@/lib/rich-content";

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
