<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-dev-discipline -->

# 开发纪律（用户约定，必须遵守）

## 铁律：生态优先 > 自研
开发任何功能前，按序判断：
1. Next.js 是否已提供该能力？
2. React 是否已提供该能力？
3. 当前项目 `components/` 是否已有可复用组件？
4. `lib/` 工具层与 CSS 令牌体系是否已覆盖？
5. npm / React / Next.js 生态是否有成熟方案？
6. 能否组合现有组件完成？
只有以上都不满足，才允许自研。

## 禁止无意义自研
不要自行重新实现：Button / Input / Dialog / Modal / Dropdown / Select / Tabs / Tooltip / Toast / Popover / Checkbox / Switch / Form / DatePicker / Icon / Animation / 响应式布局 / OAuth 基础流程 / Session 基础管理 / 通用状态管理 / 通用请求封装。除非存在真实业务差异。

## 新增依赖流程
需要 npm 包时不得直接安装。先输出报告：
包名 / 安装命令 / 解决的问题 / 为什么需要 / 当前项目为何无法解决 / 更轻量替代方案 / 安装影响范围
等待用户确认；安装命令由用户亲自执行，AI 不代为安装。

## 自研代码守则
必须自研时说明：为何不能复用现有组件 / 组件职责 / 为何单独存在 / 依赖哪些组件 / 未来可否替换为第三方 / 预计新增代码量。
禁止为小功能创建多层抽象（如 useDialog + DialogManager + DialogProvider + DialogPortal + DialogContext）。

## 修改前报告（每次改代码前必出）
- 当前问题 / 已有能力 / 可复用组件 / 建议生态方案 / 需新增依赖 / 需新增文件 / 需修改文件 / 是否需要自研 / 自研原因

## 代码透明度
不创建无法解释用途的 utils / hooks / providers / managers / services / adapters / wrappers；确需创建必须提前说明原因。

## 优先级
成熟生态 > 自己实现；已有组件 > 新建组件；组合 > 重写；简单实现 > 过度抽象；明确依赖 > 隐藏实现；少量业务代码 > 大量基础设施代码。

## 维护与完成定义（DoD，2026-08-23 治理方案，见 docs/DEVELOPER-HANDBOOK.md §2.4）
1. **"完成" = 四件事全做到**：① 新功能可用（lint + build 过）；② 被取代的代码已删除，或已在债务台账登记（不允许"留着以后用"）；③ 文档已同步（ARCHITECTURE.md / SYSTEM-ARCHITECTURE.md 随改随更）；④ `pnpm check` 全绿
2. **迁移执行登记**：手动复制 SQL 到 Supabase Dashboard 执行后，在迁移文件头部加 `-- ✅ 已执行 YYYY-MM-DD` 标记（防漏跑/防重跑）
3. **AI 交付模板**：每次功能交付必须列出 新增 / 修改 / 删除 文件清单 + 是否引入债务 + 文档同步情况
4. **AI 禁令**：不顺手改无关代码；不跨目录移动文件而不说明；不删除功能而不清理旧代码；不新增依赖而不报告（见上方"新增依赖流程"）
5. **死代码护栏**：`pnpm check`（含 knip）检出的零引用导出/文件，新代码必须当场清理；存量债务登记见 docs/DEVELOPER-HANDBOOK.md §4（剩余已知债），经确认后分批清理

<!-- END:project-dev-discipline -->
