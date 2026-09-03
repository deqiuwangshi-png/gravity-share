/**
 * 剪贴板动作层（2026-09-03 C 复制内容抽取）——收编 post-menu 等散写的内联 navigator.clipboard 调用：
 * 仅做「写入 + 降级」，不掺业务（文本组装见 lib/content-text.ts，toast 反馈留在调用方组件层）
 * 降级：非安全上下文（http / 部分 WebView）无 navigator.clipboard，回退 textarea + execCommand("copy")
 */

/** 写入剪贴板。成功返回 true；两种路径都失败返回 false（调用方自行 toast 反馈） */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* clipboard API 存在但被拒（权限/非聚焦）：落入降级 */
  }
  try {
    /* 降级路径需要 document——仅浏览器环境可达，SSR 安全 */
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    /* 移出视口且不可见（保留可 select 性，不能用 display:none） */
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
