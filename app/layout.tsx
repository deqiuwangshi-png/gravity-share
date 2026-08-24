import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "引力 | 让好东西被更多人发现",
  description: "一个开放的发现与连接平台，让分散在互联网各处的价值被更多人发现。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} antialiased`}>
      <body>
        {children}
      </body>
    </html>
  );
}
