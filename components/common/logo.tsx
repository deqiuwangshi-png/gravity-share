import Link from "next/link";

/**
 * 品牌 Logo（marketing 页 .logo / app 壳 .app-logo 共用，样式由 className 决定）
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
