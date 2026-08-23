/**
 * 文本工具：外链提取 / #标签提取（发布随手写模式用）
 */
/**
 * URL 匹配（排除中文与常见标点）
 * 注意：不带 g 标志——`.test()` 在全局正则上有 lastIndex 状态，会污染循环调用（P1-1 修复）；
 * `extractUrl` 用 match、`LinkifiedText` 用 split，均不受影响。
 */
export const URL_PATTERN = /(https?:\/\/[^\s，。！？；、）】"'”]+)/;

/** 从文本中提取第一个外链 URL */
export function extractUrl(text: string): string | undefined {
  return text.match(URL_PATTERN)?.[0];
}

/** 从文本中提取 #标签（不含 # 前缀） */
export function extractTags(text: string): string[] {
  return [...text.matchAll(/#([^\s#，。！？；、]+)/g)].map((match) => match[1]);
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
