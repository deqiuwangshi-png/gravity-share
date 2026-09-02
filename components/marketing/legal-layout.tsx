import Link from "next/link";
import { Logo } from "@/components/common/logo";

/**
 * 法律文档页共享布局（用户协议 / 隐私政策）
 * 独立极简版：无主导航，限宽 720px 居中，标题 + 更新时间 + 章节 + 版权行
 * 2026-09-02 迁移：legal-* 壳原子类化（原 styles/marketing/legal.css；
 * 章节内长文排版层 .legal-section/.legal-link/.legal-table 仍由 legal.css 提供——见 (marketing)/layout.tsx）
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
    <div className="mx-auto max-w-[720px] p-[64px_24px_96px]">
      <header className="mb-16 flex items-center justify-between">
        <Logo className="inline-flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.5px]" />
        <Link className="text-[13px] text-muted transition-[color] duration-[180ms] hover:text-primary" href="/">返回首页</Link>
      </header>
      <h1 className="mb-[10px] mt-0 text-[32px] tracking-[-1px]">{title}</h1>
      {updated && <p className="mb-12 mt-0 text-xs text-soft">最近更新：{updated}</p>}
      {children}
      <footer className="mt-[72px] border-t border-line pt-6 text-xs text-soft">© 2026 引力 · 让好东西被发现</footer>
    </div>
  );
}
