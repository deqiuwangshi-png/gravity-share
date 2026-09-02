import Link from "next/link";

/**
 * 品牌 Logo（marketing/app/auth 三区共用，文字排版由调用方 className 决定：
 * marketing 自 2026-09-02 P0 起用 Tailwind 类传参；app 壳用 .app-logo；auth 用 .auth-brand-logo）
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label="返回引力首页">
      <span className="logo-mark" aria-hidden="true">
        <span />
      </span>
      引力
    </Link>
  );
}
