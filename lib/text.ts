/**
 * 文本工具：#标签提取 / 富文本转纯文本（发布与渲染共用）
 */
/**
 * URL 匹配（排除中文与常见标点）
 * 注意：不带 g 标志——`.test()` 在全局正则上有 lastIndex 状态，会污染循环调用（P1-1 修复）；
 * `LinkifiedText` 用 split，不受影响。
 */
export const URL_PATTERN = /(https?:\/\/[^\s，。！？；、）】"'”]+)/;

/** 从文本中提取 #标签（不含 # 前缀） */
export function extractTags(text: string): string[] {
  return [...text.matchAll(/#([^\s#，。！？；、]+)/g)].map((match) => match[1]);
}

/** 用户昵称回退（queries 域共用）：空名一律回退「引力推荐」，避免头像空圈/空名展示 */
export function safeName(name: string | null | undefined): string {
  return (name ?? "").trim() || "引力推荐";
}

/** 富文本 HTML → 纯文本（列表卡片截断预览用；标签替换为空格避免词粘连，实体解码最小集） */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** 相对时间（库 created_at → 展示文案：刚刚 / X 分钟前 / X 小时前 / X 天前 / 日期）
 * 注意：1 分钟内必须返回中文「刚刚」——旧实现返回英文 "now"，在评论区表现为乱码字符（体验 BUG） */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}
