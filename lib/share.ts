/**
 * 分享动作层（2026-09-03，自 post-menu onShare 下沉——组件职责分层，见 AGENTS.md）：
 * - 有 Web Share API（navigator.share）：系统分享面板 → "shared"（含用户取消——原实现取消后降级复制）
 * - 无 share / share 失败：降级复制链接到剪贴板 → "copied" / "failed"
 * 只做「分享/复制编排」，toast 反馈留在调用方组件层（与 lib/clipboard.ts 先例一致）
 */
import { copyTextToClipboard } from "@/lib/clipboard";

/**
 * 分享内容链接。返回：
 * - "shared"：系统分享面板已处理（不展示 toast）
 * - "copied"：降级复制成功（组件 toast「链接已复制」）
 * - "failed"：复制也失败（组件 toast「复制失败」）
 */
export async function shareContentUrl({ title, url }: { title: string; url: string }): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch {
      /* share 面板取消或失败：降级复制链接（与拆分前行为一致） */
    }
  }
  return (await copyTextToClipboard(url)) ? "copied" : "failed";
}
