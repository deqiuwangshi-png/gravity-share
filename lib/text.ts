/**
 * 文本工具：外链提取 / #标签提取（发布随手写模式用）
 */
/** URL 匹配（排除中文与常见标点） */
export const URL_PATTERN = /(https?:\/\/[^\s，。！？；、）】"'”]+)/g;

/** 从文本中提取第一个外链 URL */
export function extractUrl(text: string): string | undefined {
  return text.match(URL_PATTERN)?.[0];
}

/** 从文本中提取 #标签（不含 # 前缀） */
export function extractTags(text: string): string[] {
  return [...text.matchAll(/#([^\s#，。！？；、]+)/g)].map((match) => match[1]);
}

/** 按 URL 后缀自动识别内容形态（发布零输入） */
export function judgeKind(url: string | undefined): "link" | "video" | "doc" | "image" {
  const path = (url ?? "").toLowerCase().split("?")[0];
  if (/\.(mp4|mov|webm|avi|mkv)$/.test(path)) return "video";
  if (/\.(pdf|docx?|xlsx?|pptx?|md|txt|epub)$/.test(path)) return "doc";
  if (/\.(png|jpe?g|gif|webp|svg|avif)$/.test(path)) return "image";
  return "link";
}
