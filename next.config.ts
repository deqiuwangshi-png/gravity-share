import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 旧路由兜底：推荐并入首页后，/recommend 重定向到 /home */
  redirects: async () => [
    { source: "/recommend", destination: "/home", permanent: true },
  ],
};

export default nextConfig;
