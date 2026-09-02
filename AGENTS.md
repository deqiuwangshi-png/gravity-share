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

## 样式工程规则（CSS / Tailwind 优先级，2026-09-02 落档）
**核心**：样式是工程资产，集中、可复用、可理解。新代码按以下优先级选择实现方式（上层优先）：
```text
1. Design Token（styles/globals.css 令牌变量：颜色/字号/间距/圆角/边框）
2. 公共 UI 组件（项目内已有的共享组件，如 toast/modal 壳；不新建通用 Button/Card 库）
3. Tailwind 原子类（普通组件样式默认走 className 原子类）
4. 组件级 CSS（有明确理由才允许：第三方库覆盖 / 编辑器内部 DOM（TipTap-ProseMirror）/ 复杂动画 / 伪元素 / 复杂选择器 / Token 无法表达的布局）
5. 全局 CSS（只放 reset/base/typography/令牌/全局滚动条与选区/三方库全局覆盖）
```
**禁止**：为单一组件新建配套 CSS 文件（Component.tsx + Component.css 模式）；大量堆积自定义 utility 类（.red-text/.my-card 等）；页面间创造相似而不同的颜色尺寸（颜色只用令牌变量，见上）。
**AI 新增 CSS 文件前必答 5 问**：为什么 Tailwind 无法合理解决？是否已有公共组件可复用？是否应沉淀为 Token？是否已有 CSS 可扩展？此 CSS 是否被其他组件复用？无明确理由不允许新建 CSS 文件。
**存量边界（2026-09-02 用户决策，同日多批已迁删）**：现有 styles/ 下 **19 个 CSS 文件**（按路由区扁平拆分，已含 ≤400 行治理；已迁删批次：P0 落地页 2、P3 认证区 2、P2-home+P3-壳 app 区 2（shell.css/home.css）、P2-详情页 3（square.css 剩余三件套 + square-detail.css + square-comments.css）、P-profile 区 3（profile.css/profile-posts.css/relation.css）、P-设置与合规族 5（settings.css/settings-devices.css/account-action.css/verify.css/notice.css），装饰段分别并入 styles/app/decor.css 与 styles/auth/decor.css）默认不动；仅当 ① 属于审计迁移计划分批（P0-P4，见 deliverables/css-architecture-audit-2026-09-02.md）② 组件被功能级大改时可就手迁移（色彩仍走令牌）；迁移必须遵守下方「UI 迁移颜色保护规则」。

## UI 迁移颜色保护规则（2026-09-02 用户铁律，CSS → Tailwind / shadcn 迁移必守）
**核心**：迁移 = 改变实现方式，不是重新设计。视觉（颜色/层级/对比度/明暗）必须与迁移前一致；任何颜色定义不得凭变量名或视觉猜测，必须基于已确认的 Token 映射。
1. **先建映射后动手**：颜色迁移前必读 `styles/globals.css`（:root 全量变量 + @theme inline 映射）、docs/STYLE-SYSTEM.md §2 映射表、被迁组件的实际 className / var() 用法；产出「旧 → 新」一一对应清单；**映射确认前禁止任何批量改色**。
2. **语义以实际用法为准，不靠名字猜**：`--foreground` 是文字色不是背景、`--surface` 是卡片底不是页底；迁移前先 grep 该变量的消费处确认语义，再定去向。
3. **禁止硬编码替换**：`var(--primary)` 不得替换成 `green` / `#006855` / `emerald-600` 等裸值或猜测类；仅当原 CSS 本就是该值且映射已确认（值不变），才允许同值收编进令牌（如 Q4 把散写 `#a32d2d` 收编为 `--accent-warn`）。
4. **Light / Dark 双验**：当前项目仅 light 单主题（无 dark 层）；**未来引入 dark 主题后**，每批迁移必须 light + dark 分别核对：页面背景 / 文字 / 卡片 / 边框 / Primary 及其上文字 / Muted / Hover 均不得反转。
5. **颜色变化即停**：迁移中发现任何背景变化 / 文字反转 / Primary 变化 / 明暗反转 / 卡片层级变化 → **立即停止批量迁移**，输出下方六元组等待用户确认，不得自行"猜一个对的色值"继续：
```text
原 Token：    原颜色：
新 Token：    新颜色：
发生变化的组件：
变化原因：
```
6. **验收标准**：视觉一致 + Token 语义正确 + 组件复用提高 + CSS 减少 + Tailwind 正常工作 + shadcn/ui 正确复用。CSS 文件数增减 / Tailwind 类数量本身**不是**成功标准。

## 维护与完成定义（DoD，2026-08-23 治理方案，见 docs/DEVELOPER-HANDBOOK.md §2.4）
1. **"完成" = 四件事全做到**：① 新功能可用（lint + build 过）；② 被取代的代码已删除，或已在债务台账登记（不允许"留着以后用"）；③ 文档已同步（ARCHITECTURE.md / SYSTEM-ARCHITECTURE.md 随改随更）；④ `pnpm check` 全绿
2. **迁移执行登记**：手动复制 SQL 到 Supabase Dashboard 执行后，在迁移文件头部加 `-- ✅ 已执行 YYYY-MM-DD` 标记（防漏跑/防重跑）
3. **AI 交付模板**：每次功能交付必须列出 新增 / 修改 / 删除 文件清单 + 是否引入债务 + 文档同步情况
4. **AI 禁令**：不顺手改无关代码；不跨目录移动文件而不说明；不删除功能而不清理旧代码；不新增依赖而不报告（见上方"新增依赖流程"）
5. **死代码护栏**：`pnpm check`（含 knip）检出的零引用导出/文件，新代码必须当场清理；存量债务登记见 docs/DEVELOPER-HANDBOOK.md §4（剩余已知债），经确认后分批清理

<!-- END:project-dev-discipline -->
