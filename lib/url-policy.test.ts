/**
 * url-policy（sanitizeUrl）安全回归测试 —— 2026-08-24 安全加固随测
 * 覆盖：协议白名单 / 内网与保留段 / userinfo / 端口 / 长度边界
 */
import { describe, expect, it } from "vitest";
import { sanitizeUrl } from "@/lib/url-policy";

describe("sanitizeUrl（外链入库标准化）", () => {
  it("合法 https 原样通过并规范化", () => {
    expect(sanitizeUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
  });

  it("无协议补 https:// 前缀", () => {
    expect(sanitizeUrl("www.example.com")).toBe("https://www.example.com/");
    expect(sanitizeUrl("example.com/path")).toBe("https://example.com/path");
  });

  it("危险协议一律拒绝（javascript / data）", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeUrl("javascript:alert(document.cookie)")).toBeNull();
    expect(sanitizeUrl("data:text/html,<script>1</script>")).toBeNull();
    expect(sanitizeUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("内网 / 保留段 / localhost 拒绝", () => {
    expect(sanitizeUrl("http://127.0.0.1/x")).toBeNull();
    expect(sanitizeUrl("http://10.0.0.8/x")).toBeNull();
    expect(sanitizeUrl("http://192.168.1.1/x")).toBeNull();
    expect(sanitizeUrl("http://localhost/x")).toBeNull();
    expect(sanitizeUrl("http://169.254.169.254/latest/meta-data")).toBeNull();
    expect(sanitizeUrl("http://[::1]/x")).toBeNull();
  });

  it("userinfo（user:pass@）拒绝", () => {
    expect(sanitizeUrl("https://user:pass@example.com/x")).toBeNull();
    expect(sanitizeUrl("https://attacker@example.com/x")).toBeNull();
  });

  it("非标准端口拒绝（80/443 放行；WHATWG 规范化会去掉 https 默认端口）", () => {
    expect(sanitizeUrl("https://example.com:8080/x")).toBeNull();
    expect(sanitizeUrl("https://example.com:22/x")).toBeNull();
    expect(sanitizeUrl("https://example.com:443/x")).toBe("https://example.com/x");
  });

  it("超长与空输入拒绝", () => {
    expect(sanitizeUrl("")).toBeNull();
    expect(sanitizeUrl("   ")).toBeNull();
    expect(sanitizeUrl(`https://example.com/${"a".repeat(3000)}`)).toBeNull();
  });
});
