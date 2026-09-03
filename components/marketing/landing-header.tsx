import Link from "next/link";
import { Logo } from "@/components/common/logo";

/**
 * 落地页吸顶导航（2026-09-02 P0 试点：自 (marketing)/page.tsx 内联 header 拆出，样式由 site.css 迁 Tailwind 原子类）
 * 服务端静态组件：Logo + 主导航 + 登录入口
 */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background">
      <nav
        className="container flex h-[76px] items-center justify-between max-[520px]:h-[68px]"
        aria-label="主导航"
      >
        <Logo className="inline-flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.5px]" />
        <div className="flex items-center gap-[30px] text-sm text-muted max-[800px]:hidden">
          <Link href="/" className="transition-colors duration-[180ms] hover:text-foreground">首页</Link>
          <Link href="#pricing" className="transition-colors duration-[180ms] hover:text-foreground">定价</Link>
          <Link href="/about" className="transition-colors duration-[180ms] hover:text-foreground">关于</Link>
          <Link href="/#faq" className="transition-colors duration-[180ms] hover:text-foreground">常见问题</Link>
        </div>
        <div className="flex items-center gap-3 max-[520px]:gap-1">
          <Link
            href="/login"
            className="cursor-pointer rounded-control bg-primary px-[17px] py-2.5 text-sm text-on-primary transition-[background,transform] duration-[180ms] hover:-translate-y-px hover:bg-primary-dark max-[520px]:px-3 max-[520px]:py-[9px]"
          >
            登录
          </Link>
        </div>
      </nav>
    </header>
  );
}
