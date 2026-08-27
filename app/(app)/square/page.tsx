import { permanentRedirect } from "next/navigation";

/**
 * 广场已合并进首页（2026-08-27 方案A）：/square 永久重定向 /home
 * 详情页 /square/[id] 保留不动（帖子仍可直达）
 */
export default function SquarePage() {
  permanentRedirect("/home");
}
