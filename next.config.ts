import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 旧路由兜底：推荐并入首页后，/recommend 重定向到 /home */
  redirects: async () => [
    { source: "/recommend", destination: "/home", permanent: true },
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
