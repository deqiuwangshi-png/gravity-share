import { describe, expect, it } from "vitest";
import { extractUrl, extractTags, formatRelativeTime } from "@/lib/text";

describe("extractUrl", () => {
  it("提取 http/https 外链", () => {
    expect(extractUrl("看这个 https://example.com/a?b=1 有用")).toBe("https://example.com/a?b=1");
  });

  it("中文字符/标点中断 URL", () => {
    expect(extractUrl("链接 https://a.com/1，后面")).toBe("https://a.com/1");
  });

  it("无 URL 返回 undefined", () => {
    expect(extractUrl("这里没有链接")).toBeUndefined();
  });
});

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
