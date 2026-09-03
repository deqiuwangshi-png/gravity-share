import type { MetadataRoute } from "next";

/**
 * Web App Manifest（2026-09-03）：PWA 安装元数据（Android 主屏 / 桌面安装）
 *
 * 资产方案（2026-09-03 重整）：
 * - app/favicon.ico  ← 多分辨率 ICO（用户设计稿出图，老浏览器 / Google 兜底）
 * - app/icon.png     ← 高 DPI PNG（用户设计稿，浏览器 tab + manifest 共用）
 * - app/apple-icon.png ← iOS 主屏 180×180
 * Next.js 16 文件约定同时识别以上三个，自动产出
 *   <link rel="icon" href="/favicon.ico" sizes="any">
 *   <link rel="icon" href="/icon?<hash>" type="image/png" sizes="...">
 *   <link rel="apple-touch-icon" href="/apple-icon?<hash>" type="image/png" sizes="180x180">
 * 三者用途不同（favicon.ico 多分辨率兜底 / icon.png 高 DPI / apple-icon iOS），
 * 不是互相覆盖的「重复 favicon」，是官方推荐的多档位图标组合。
 *
 * 本文件**不**再声明 <link rel="icon">，icons 数组只供 PWA 安装器读取。
 *
 * 颜色一律取自 styles/globals.css 令牌（不硬编码猜测色）：
 *   theme_color      ← --primary     #006855（品牌绿）
 *   background_color ← --background  #f7f8f6（启动闪屏底色，与站点背景一致）
 * 文案与 app/layout.tsx 的 metadata 同源，避免两处漂移。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "引力 | 让好东西被更多人发现",
    short_name: "引力",
    description: "一个开放的发现与连接平台，让分散在互联网各处的价值被更多人发现。",
    lang: "zh-CN",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8f6",
    theme_color: "#006855",
    icons: [{ src: "/icon.png", type: "image/png", purpose: "any" }],
  };
}
