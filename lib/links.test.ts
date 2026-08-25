import { describe, expect, it } from "vitest";
import { riskOf, safeHref, safeRedirectTarget, normalizeUrl, hostOf } from "@/lib/links";

describe("riskOf（外链安全分级，库表数据由调用方传入）", () => {
  const trusted = new Set(["github.com", "zhihu.com"]);
  const blocked = new Set(["fake-login.xyz", "example-evil.com"]);

  it("白名单域名 → low", () => {
    expect(riskOf("https://github.com/user/repo", trusted, blocked)).toBe("low");
  });

  it("白名单子域名逐级匹配 → low", () => {
    expect(riskOf("https://a.b.github.com/x", trusted, blocked)).toBe("low");
  });

  it("黑名单 → high", () => {
    expect(riskOf("https://fake-login.xyz/a", trusted, blocked)).toBe("high");
  });

  it("未知域名 → unknown", () => {
    expect(riskOf("https://totally-unknown-site.io/a", trusted, blocked)).toBe("unknown");
  });

  it("非法 URL → high", () => {
    expect(riskOf("not-a-url", trusted, blocked)).toBe("high");
  });

  it("空库表（020 未执行回退）→ 全部 unknown/合法域名", () => {
    expect(riskOf("https://github.com/a", new Set(), new Set())).toBe("unknown");
  });
});

describe("safeHref（外链中转）", () => {
  it("http/https → 生成 /go 中转链接", () => {
    expect(safeHref("https://example.com/a?b=1")).toBe(`/go?url=${encodeURIComponent("https://example.com/a?b=1")}`);
  });

  it("非 http/https 协议 → null（防 javascript: 注入）", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
  });

  it("非法字符串 → null", () => {
    expect(safeHref("not a url")).toBeNull();
  });
});

describe("safeRedirectTarget（/go 严格校验，2026-08-25 M5）", () => {
  it("正常 https URL → 返回规范化 href + host", () => {
    expect(safeRedirectTarget("https://example.com/a?b=1")).toEqual({
      ok: true,
      href: "https://example.com/a?b=1",
      host: "example.com",
    });
  });

  it("拒绝 userinfo（@ 地址栏伪装：https://google.com@evil.com）", () => {
    expect(safeRedirectTarget("https://google.com@evil.com/x")).toEqual({ ok: false });
  });

  it("拒绝带密码的 userinfo", () => {
    expect(safeRedirectTarget("https://user:pass@evil.com/x")).toEqual({ ok: false });
  });

  it("拒绝反斜杠混淆（浏览器与严格解析不一致）", () => {
    expect(safeRedirectTarget("https://evil.com\\@google.com")).toEqual({ ok: false });
  });

  it("拒绝非 http/https 协议（javascript: 注入）", () => {
    expect(safeRedirectTarget("javascript:alert(1)")).toEqual({ ok: false });
  });

  it("拒绝非法字符串", () => {
    expect(safeRedirectTarget("not a url")).toEqual({ ok: false });
  });
});

describe("normalizeUrl（补协议）", () => {
  it("无协议补 https://", () => {
    expect(normalizeUrl("example.com/a")).toBe("https://example.com/a");
    expect(normalizeUrl("www.example.com")).toBe("https://www.example.com");
  });

  it("已有协议保持不变", () => {
    expect(normalizeUrl("http://a.com")).toBe("http://a.com");
    expect(normalizeUrl("https://a.com/x")).toBe("https://a.com/x");
  });
});

describe("hostOf（域名提取）", () => {
  it("提取 hostname", () => {
    expect(hostOf("https://a.b.example.com/x")).toBe("a.b.example.com");
  });

  it("无协议也能提取（先补协议）", () => {
    expect(hostOf("example.com/a")).toBe("example.com");
  });

  it("非法输入回退原文", () => {
    expect(hostOf("not a url")).toBe("not a url");
  });
});
