import Image from "next/image";
import Link from "next/link";

/**
 * 品牌 Logo（marketing / app / auth 三区共用）
 *
 * 2026-09-03 品牌一致性收口：标记由「CSS 手绘」改为「引用真实品牌资产」。
 * 原实现是 globals.css 的 .logo-mark（32px 圆 + var(--primary) 底 + 白色双环 + 圆点），
 * 与浏览器 favicon（圆角方块 + G + 轨道，深翡翠底）是两套设计，视觉语言不统一；
 * 且三区各有一处尺寸/配色覆盖（app 缩 30px、auth 垫白 16%），越改越脆。
 *
 * 现统一引用 /brand/logo.png（与 app/icon.png 同源的圆角方块 + G + 轨道设计），
 * 站点 Logo 与 favicon 视觉语言对齐；.logo-mark 及两处覆盖规则已随之删除。
 *
 * 文字排版仍由调用方 className 决定（三区字号/间距不同，保持既有传参方式）。
 */
export function Logo({
  className,
  size = 32,
}: {
  className?: string;
  /** 标记边长（px）：app 侧栏传 30，marketing / auth 用默认 32 */
  size?: number;
}) {
  return (
    <Link href="/" className={className} aria-label="返回引力首页">
      <Image
        src="/brand/logo.png"
        alt=""
        width={size}
        height={size}
        aria-hidden
        className="shrink-0"
      />
      引力
    </Link>
  );
}
