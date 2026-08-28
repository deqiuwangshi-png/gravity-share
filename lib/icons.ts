/**
 * 配置/数据层图标表（单一来源）——仅供可序列化的静态配置引用（config.ts 导航/分类枚举等）
 * 组件 UI 层图标一律用 lucide-react（2026-08-28 P2-3 边界收口：本表不再被组件直接渲染）
 * 数据/配置层一律引用本表，禁止散落字符字面量（治理规则 R3）
 * 注：公告走马灯图标走「数据存标识 → 组件渲染 SVG」模式，不在此表
 */
export const ICONS = {
  /* 导航 */
  home: "⌂",
  plaza: "◉",
  categories: "▦",
  /* 内容类型 */
  discover: "✦",
  dev: "⌘",
  design: "◇",
  knowledge: "▤",
  tool: "◎",
  course: "▱",
  service: "◈",
  opportunity: "↗",
  /* 交互（仍被配置层引用：search 用于「其他」分类、save/close/help/logout 已于 P2-3 迁移 lucide 后移除） */
  search: "⌕",
} as const;
