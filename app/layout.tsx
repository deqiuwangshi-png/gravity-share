/* 2026-08-28：字体改系统栈（globals.css --font-sans），去掉 next/font/google 规避国内 fonts.gstatic.com 不可达导致的构建失败 */
import type { Metadata } from "next";
import "@/styles/globals.css";
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
    /* 2026-09-03：og-image（1200×630）落位后升级为大图卡；图片本身由 app/opengraph-image.tsx 文件约定注入 */
    card: "summary_large_image",
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
      </body>
    </html>
  );
}
