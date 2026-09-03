/**
 * twitter-image 社交分享卡片（D-06 收口，2026-09-04）
 *
 * X(Twitter) 爬虫优先读 twitter:image（而非 og:image），微信/微博/飞书只读 og:image。
 * 本文件补齐 twitter 侧入口，视觉与 og 卡完全同源 —— 直接 re-export
 * app/opengraph-image.tsx 的全部导出（单一源，文案/配色改动只改一处）。
 * Next 文件约定：app/twitter-image.tsx → twitter:image / twitter:image:alt 等 meta；
 * layout.tsx 的 twitter.card 已为 summary_large_image（1200×630 大图规格）。
 */
export { default, alt, size, contentType } from "./opengraph-image";
