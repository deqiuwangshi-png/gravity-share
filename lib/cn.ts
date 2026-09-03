/**
 * className 拼接工具（2026-09-03 P0，零依赖）：
 * 过滤空值后以空格连接；本项目样式全为无冲突追加（原子类），不需要 tailwind-merge 的冲突合并
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
