import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt（2026-08-25 SEO 方案 M1）：
 * 允许：营销区 + 法律区 + 公告 + 分类/广场/个人主页（公开只读内容）
 * 禁止：/api（接口）、认证页、/home（应用主页需登录）、/go（外链跳转网关，防权重流失）
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/about",
        "/governance",
        "/guidelines",
        "/enforcement",
        "/disclaimer",
        "/terms",
        "/privacy",
        "/notice",
        "/categories",
        "/square",
        "/profile",
        "/tag",
      ],
      disallow: [
        "/api",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/home",
        "/go",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
