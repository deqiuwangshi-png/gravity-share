import Link from "next/link";
import { Logo } from "@/components/common/logo";

/**
 * 法律文档页共享布局（用户协议 / 隐私政策）
 * 独立极简版：无主导航，限宽 720px 居中，标题 + 更新时间 + 章节 + 版权行
 */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal-page">
      <header className="legal-header">
        <Logo className="inline-flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.5px]" />
        <Link className="legal-back" href="/">返回首页</Link>
      </header>
      <h1>{title}</h1>
      {updated && <p className="legal-updated">最近更新：{updated}</p>}
      {children}
      <footer className="legal-footer">© 2026 引力 · 让好东西被发现</footer>
    </div>
  );
}
