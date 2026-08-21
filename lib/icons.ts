/**
 * 全站统一图标（单一来源）
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
  /* 交互 */
  search: "⌕",
  save: "♡",
  help: "?",
  logout: "⏻",
  close: "×",
} as const;
