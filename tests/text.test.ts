import { describe, expect, it } from "vitest";
import { extractTags, formatRelativeTime, stripHtml } from "@/lib/text";

describe("extractTags", () => {
  it("提取 #标签（不含 # 前缀）", () => {
    expect(extractTags("分享 #前端 #AI 工具")).toEqual(["前端", "AI"]);
  });

  it("无标签返回空数组", () => {
    expect(extractTags("没有标签")).toEqual([]);
  });
});

describe("formatRelativeTime", () => {
  it("1 分钟内返回「刚刚」", () => {
    expect(formatRelativeTime(new Date(Date.now() - 30_000).toISOString())).toBe("刚刚");
  });

  it("分钟前", () => {
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe("5 分钟前");
  });

  it("小时前", () => {
    expect(formatRelativeTime(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe("3 小时前");
  });

  it("天前", () => {
    expect(formatRelativeTime(new Date(Date.now() - 2 * 86_400_000).toISOString())).toBe("2 天前");
  });
});

describe("stripHtml（富文本 → 纯文本预览）", () => {
  it("剥离标签并规整空白", () => {
    expect(stripHtml("<h2>标题</h2><p>正文 <b>加粗</b> 内容</p>")).toBe("标题 正文 加粗 内容");
  });

  it("换行与实体解码", () => {
    expect(stripHtml("<p>第一行<br>第二行</p><p>&amp; &lt;tag&gt;</p>")).toBe("第一行 第二行 & <tag>");
  });

  it("纯文本原样", () => {
    expect(stripHtml("没有标签")).toBe("没有标签");
  });
});
