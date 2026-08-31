/* 2026-08-28：字体改系统栈（globals.css --font-sans），去掉 next/font/google 规避国内 fonts.gstatic.com 不可达导致的构建失败 */
import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import { ADSENSE_CLIENT } from "@/lib/config";
import { SITE_URL, buildOrganization, buildWebSite, jsonLd } from "@/lib/seo";

/* 全站 metadata 基座（2026-08-25 SEO 方案 M1）：metadataBase + title template + OG + canonical + JSON-LD 种子 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "引力 | 让好东西被更多人发现",
    template: "%s | 引力",
  },
  description: "一个开放的发现与连接平台，让分散在互联网各处的价值被更多人发现。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    siteName: "引力",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="antialiased">
      <body>
        {/* JSON-LD 结构化数据（知识图谱「品牌区」种子，零依赖原生注入） */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(buildOrganization()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(buildWebSite()) }} />
        {children}
        {/* AdSense 加载脚本（未配置发布商 ID 时不注入，零请求、零副作用）
            afterInteractive：先完成水合再加载，不拖慢首屏
            ⚠ 未来若启用 CSP（next.config.ts 已注明延后），必须放行
               https://pagead2.googlesyndication.com 与 https://*.doubleclick.net，否则广告全部失效 */}
        {ADSENSE_CLIENT && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
