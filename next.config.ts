import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 旧路由兜底（P2-1 归一 2026-08-28）：静态退役路由统一收口于此（308 永久重定向）
   * /recommend → 推荐并入首页；/register → 登录即注册；/square → 广场合并首页
   * 动态参数退役路由（/discover/[id]）无法在配置表达，保留在页面组件内 redirect */
  redirects: async () => [
    { source: "/recommend", destination: "/home", permanent: true },
    { source: "/register", destination: "/login", permanent: true },
    { source: "/square", destination: "/home", permanent: true },
  ],
  /* C4 基础安全头（CSP 延后：inline style + next/font 需 nonce 方案，上线前专项） */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
