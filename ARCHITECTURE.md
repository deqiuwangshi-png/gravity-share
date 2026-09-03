# 引力（yinli）架构规范

> 版本：v4.0（2026-09-03 单一架构收敛）· 适用范围：本项目全部新增 / 重构代码
> 单一真相源：本文 = 架构规范；AGENTS.md = 开发纪律；docs/DEBTS.md = 债务台账 + 规模化前置；docs/INCIDENTS.md = 缺陷复盘；docs/OPERATIONS-RUNBOOK.md = 运营手册
> 核心主张：**柜子即层、依赖单向、一个色板。架构是"涨"出来的，不是"设计"出来的。**

---

## 1. 技术栈基线

| 项 | 值 | 约定 |
|---|---|---|
| 框架 | Next.js 16（App Router） | 页面优先用 Server Component，需要交互才加 `"use client"`；查库页面用 `export const dynamic = "force-dynamic"` 避免 build 固化数据；入口守卫用根级 `proxy.ts`（替代 middleware） |
| 语言 | TypeScript 5 `strict` | 禁止 `any`、`@ts-ignore`；新代码必须通过 `pnpm lint` + `pnpm build` |
| 样式 | Tailwind CSS 4 + 全局 CSS | 颜色只用 `styles/globals.css` 里的变量（令牌唯一真相源），不写色号；CSS 统一放 `styles/`，单文件 ≤ 400 行 |
| 包管理 | pnpm 11 | 禁止混用 npm/yarn，锁定提交 `pnpm-lock.yaml` |
| 路径别名 | `@/*` → 项目根 | 所有 import 用 `@/` 开头，禁止相对路径跨目录引用 |
| 数据边界 | **Supabase BaaS（Auth + Postgres RLS + Storage）** | 读走 `lib/queries/`（子目录化 2026-09-03）；写靠 RLS + 列级权限；一致性靠触发器；服务端操作走 `lib/supabase/admin.ts`（service_role，**仅 route handler，严禁客户端 import**）；**不引入自建后端** |
| 第三方登录 | GitHub + Google（Supabase OAuth，PKCE） | 回调统一走 `/auth/callback`（code → session）；provider 清单在 `lib/config.ts` 的 `OAUTH_PROVIDERS` |
| 测试 | vitest（纯函数冒烟） | 测试文件统一收口 `tests/`（2026-09-03 迁离 lib/）；`pnpm check` = eslint → test → check-styles → knip → typecheck 全量守门 |

## 2. 柜子模型（目录即层）

```
app/          路由·页面·布局柜 —— 一页一个文件，文件名即网址；api/ route handler 只做接线
components/   组件柜 —— 用到两次才抽，按「访问区 → feature」双层；ui/ 为无业务纯 UI 层（官方件，禁 import 业务，业务组件组合它）
hooks/        hook 柜 —— 可复用 client 状态机唯一归宿（2026-09-03 起；lib/ 禁放 React hook）
lib/          数据·业务·工具柜 —— 动作（*-actions）/ 读查询（queries/）/ 类型（types.ts）/ 配置 / 纯函数
styles/       样式柜 —— globals.css 令牌 + 按访问区分目录（app / marketing / auth），单文件 ≤ 400 行
supabase/     迁移柜 —— 数据库唯一真相（001-046，幂等可重跑；手动复制 SQL 到 Dashboard 执行，不引入 CLI）
tests/        测试柜 —— 单测统一收口（2026-09-03 起；lib/ 只放源码）
```

> 组件分层现状：访问区层（common / marketing / app）+ 应用区共享层（app/common）+ feature 层（app 下 shell / discovery / square）。hooks/ 归位 6 件、tests/ 收口 8 件（2026-09-03 收官）。何时再细分：某 feature 目录超过 10 个文件再继续分；页面超过 8 个再模块化。**不提前设计。**

## 3. 三条规则（就这些）

1. **数据只在 `lib/` 里拿** —— 页面与组件不手写 mock 数组；内容/评论/互动/通知全部读 `lib/queries/`（Supabase），`lib/data.ts` 仅存静态配置
2. **重复第二次才抽组件** —— 第一次内联，出现第二次再抽到 `components/`
3. **颜色只用变量** —— 全站色值集中在 `styles/globals.css` 色板，组件不写 `#hex`

## 4. 依赖方向与单一架构归属（单向流动）

```
app（路由·页面·布局）
   ↓
components（UI：ui 官方件 → 业务展示组件）
   ↓
hooks（client 状态机，可复用编排）
   ↓
lib（业务动作 · 读查询 · 类型 · 配置 · 纯工具）—— 最底层业务，谁都能依赖
   ↓
平台（Supabase BaaS · Next 运行时 · 工程设施）
```

**单一架构归属总表（10 类 → 归宿，2026-09-03 收敛）**：

| # | 类 | 归宿 | 准入规则 |
|---|-----|------|---------|
| 1 | 路由文件 | `app/api/*/route.ts` ×6 · `app/go` 网关 · `app/robots.ts` / `sitemap.ts` | 只做接线/校验/转发；敏感写走 admin 客户端；新写先定「RLS/列级/触发器/Handler」归属 |
| 2 | 页面 | `app/(app|auth|marketing)/**/page.tsx`（27） | 纯编排（import+组装+JSX）；取数/SEO 派生下沉 lib（square-detail.ts 先例） |
| 3 | 布局 | 4 个分组 `layout.tsx` + `loading`/`error` + `_components/` 私有件 | 分组壳只放导航/认证态/路由出口 |
| 4 | 组件 UI | `components/`（ui 官方 9 + 业务展示 38） | ui/ 零业务禁引业务组件；业务组件只留展示 + 受控交互；写下沉 lib、状态机下沉 hooks |
| 5 | 业务（动作） | `lib/*-actions.ts` ×8 + `reports`/`share`/`content-actions` | 无 React；收 SupabaseClient 入参；返回 `{ok}`；BUG-14 回滚/清旧图收纳；同款只存一处 |
| 6 | 数据（读） | `lib/queries/` ×5 + `square-detail`/`profile-detail` + `storage.ts` | 读查询唯一出口；DTO 映射收敛 types.ts；组件禁直写业务表（已零残留） |
| 7 | 工具 | `lib/` 纯函数族 ×12 | 零 React 零 DB；谁都能依赖；无隐含副作用 |
| 8 | 钩子 | `hooks/` 根级 ×6 | 可复用 client 状态机唯一归宿；lib/ 禁放 hook |
| 9 | 类型定义 | `lib/types.ts` 枢纽 + 文件内局部 | 域/展示模型（DTO）→ types.ts；动作入参/局部类型就近（同族可 export），不跨层当"域类型" |
| 10 | 基础设施 | `proxy.ts` / `next.config.ts` / `lib/supabase/` ×3 / `supabase/migrations` / `styles/` / `tests/` / `scripts/` | proxy 管守卫 + 会话刷新；admin 客户端仅 route handler；迁移头部 ✅ 标记 |

禁止：`lib/` import 组件、组件之间互相 import（共享一律走 `components/`）、页面互相 import、跨 route group 引用。

**数据安全四层**（v2.7 起）：
1. **RLS 管身份** —— 内容公开读 + 作者写，互动/通知仅本人（34+ 策略）；
2. **列级权限管敏感字段** —— `points` 与计数列（`likes_count/comments_count`）对 API 直读直写被拒，本人取值走 RPC（`get_my_points`）；
3. **触发器管一致性** —— 计数、互动→通知、内容删除→通知清理、OAuth 建档（6+ 函数）；
4. **service_role 管服务端操作** —— 注销等管理操作走 Route Handler（`lib/supabase/admin.ts`，密钥仅 server 环境，严禁客户端 import）。

写路径：发布/评论/点赞/收藏/关注/已读由 client 直接 `insert/update`（RLS 校验）；敏感读取走 RPC；管理操作走 Route Handler——**新增写操作必须先问「这条规则该在哪一层」**。

## 5. 命名与文件规范

| 项 | 规则 | 示例 |
|---|---|---|
| 页面文件 | 固定名 `page.tsx` / `layout.tsx` | `app/(app)/home/page.tsx` |
| 组件文件 | PascalCase，一个文件一个组件；按「访问区 → feature」两层归入 `components/<区>/<feature>/`，跨区共享放 `common/`，无业务纯 UI 放 `components/ui/` | `components/app/square/square-actions.tsx` / `components/ui/button.tsx` |
| Hook 文件 | camelCase `use*`，一个文件一个 hook，归根级 `hooks/`（client 状态逻辑；禁放 lib/ 工具层） | `hooks/use-square-posts.ts` |
| 测试文件 | `tests/<被测模块>.test.ts` 统一收口 | `tests/url-policy.test.ts` |
| 私有文件 | `_` 前缀（不参与路由） | `(auth)/_components/auth-form.tsx` |
| 类型 | 组件 Props 用 `XxxProps` 命名（简单组件可内联）；展示模型用 `XxxDTO`（queries/ 统一映射，集中在 lib/types.ts） | `SquarePostDTO`（lib/types.ts） |
| 常量 | UPPER_SNAKE_CASE | `MARKETING_CATEGORIES` |
| 样式文件 | 按访问区归入 `styles/<区>/`，文件名 = 组件/区块维度，单文件 ≤ 400 行 | `styles/marketing/legal.css` |
| 数据库 | 迁移文件 `supabase/migrations/NNN-*.sql`，幂等可重跑，头部注释动机；**手动复制 SQL 到 Supabase Dashboard 执行（不引入 CLI）** | `002-content-seed.sql` |

> **类型去向边界（2026-09-03 明示，防隐性双轨）**：域模型/展示模型（DTO）→ `lib/types.ts` 枢纽；动作入参/文件局部类型 → 定义处就近声明（同族消费可 export），**不得**在 types.ts 以外累积"域级"类型、也不得让 types.ts 反向依赖业务文件。

### 5.1 Server / Client 边界

- 默认 Server Component；需要交互状态 / 浏览器 API 时才加 `"use client"`
- 查库的 Server 页面加 `export const dynamic = "force-dynamic"`（防 build 时固化数据）；列表由 client 组件（SquareFeed 等）拉取则无需
- Client 组件尽量下沉到叶子节点，避免客户端化整棵子树

## 6. 色板（全站颜色变量，定义在 `globals.css`，唯一真相源）

| 分类 | 变量 | 色值 |
|---|---|---|
| 主色 | `--primary` `#006855` / `--primary-dark` `#005346` / `--primary-soft` `#e9f3ef` / `--primary-subtle` `#f0f6f3` / `--on-primary` `#ffffff` | 按钮、链接、选中、标签底 |
| 辅助 | `--accent` `#f3c969` / `--accent-soft` `#faf4df` / `--on-accent` `#8b6b20` | 金色点缀、商业标签 |
| 背景 | `--background` `#f7f8f6` / `--surface` `#ffffff` / `--bg-raised` `#fbfcfb` / `--bg-hover` `#f0f3f1` | 页面底、卡片、侧边栏、hover |
| 文字 | `--foreground` `#111816` / `--text-muted` `#68736f` / `--text-soft` `#8a938f` / `--text-disabled` `#b4bcb8` | 主文、说明、弱提示、禁用 |
| 边框 | `--border` `#e4e8e5` / `--border-primary` `#a9d0c5` | 常规边框、主色态边框 |

> 语义色（成功/警告/错误）**用到再加**；`rgba()` 阴影保留（属 `--shadow-*`，非色值令牌）。shadcn 别名键映射（primary-foreground→on-primary、destructive→error、input→border、ring→border-primary）见 globals.css `@theme inline`。

### 6.1 品牌资产（单一源，2026-09-03 收口）

品牌视觉统一为「圆角方块 + G + 轨道」（深翡翠底），**站点 Logo 与浏览器 favicon 同源**。

| 用途 | 文件 | 消费方式 |
|---|---|---|
| **Logo 唯一源** | `public/brand/logo.png`（180×180 / 30KB） | `components/common/logo.tsx` 用 `next/image` 引用，marketing / app / auth 三区共用 |
| favicon 三件套 | `app/favicon.ico` + `app/icon.png`（512×512）+ `app/apple-icon.png`（180×180） | Next.js 文件约定自动注入 `<link rel="icon">`；`app/manifest.ts` 的 icons 指向 `/icon.png` |
| 社交分享卡片 | ❌ 待补（`app/opengraph-image.tsx`） | 已登记 `docs/DEBTS.md` |

**换品牌时必须同步替换 4 份**：`public/brand/logo.png`、`app/icon.png`、`app/apple-icon.png`、`app/favicon.ico`（同源人工同步，无构建期派生）。

**禁止**：
- ❌ 用 CSS 手绘品牌标记 —— 2026-09-03 已退役 `.logo-mark` 及 `app/decor.css`、`auth/decor.css` 两处尺寸/配色覆盖（共约 40 行），回归「生态优先 > 自研」
- ❌ 引用 `mark.svg` 一类「SVG 壳包 base64 PNG」的伪矢量资产 —— 2.5MB 且不具备矢量特性；且 `app/` 下非约定文件名**不会**被 serve 成 `/mark.svg`

## 7. 团队协作约定

1. **新增文件先定位**：页面 → `app/`；共享组件 → `components/`；可复用 hook → `hooks/`；动作/数据/类型/配置 → `lib/`；单测 → `tests/`；表结构/触发器 → `supabase/migrations/`
2. **提交前自检**：`pnpm lint` + `pnpm build` 通过；不新建目录（除非触发 §2 的分层条件）
3. **重复第二次就抽象**，第一次允许内联
4. **数据只从 `lib/queries/` / `lib/data.ts` 拿**，颜色只从色板取
5. **文档同步**：结构有重大调整时更新本文档；债务登记 `docs/DEBTS.md`；缺陷复盘 `docs/INCIDENTS.md`

### 7.5 维护方案（治理护栏）

架构防腐化策略（2026-08-23 治理体系，DoD 细则见 AGENTS.md）：
- **日常改动后跑 `pnpm check`**（eslint + 测试 + 治理脚本 + 死代码检测），新死代码当场清理；
- **债务登记**：剩余已知债与规模化前置见 `docs/DEBTS.md`（债务台账），经确认后分批清理；
- **迁移手动执行**（用户决策，不引入 CLI）：执行后迁移文件头加 `-- ✅ 已执行 YYYY-MM-DD` 标记；
- AI 改动遵守 AGENTS.md「维护与完成定义（DoD）」。

## 8. 演进状态

| 里程碑 | 状态 | 说明 |
|---|---|---|
| Supabase BaaS 上库 + 认证安全闭环 | ✅ | 2026-08-22；RLS/触发器/存储/RPC 体系就位 |
| SEO 公开化（游客可读） | ✅ | 2026-08-25；/square /categories /profile/[id] 开放，proxy 守卫收口 /home |
| 029 title 列回收、`square_posts.preview` 下沉 | ✅ | 2026-08-29 / 2026-09-03；卡片摘要走 immutable 触发器 `square_preview()` |
| 详情页 page 职责拆分 + hooks/ 柜成立 | ✅ | 2026-09-03；数据加载迁 lib/square-detail.ts、SEO 派生迁 lib/seo.ts；useSquarePosts 归位 hooks/ |
| lib/queries 子目录化 + tests/ 收口 | ✅ | 2026-09-03；queries-*.ts 平铺 → lib/queries/；测试统一迁 tests/ |
| **商业化四族全删（支付/订阅/投流/广告）** | ✅ | 2026-09-03；平台回归纯内容分发，无付费通道/置顶位/广告位；DB 侧待执行 `045-drop-billing.sql` |
| 组件职责分层收官 | ✅ | 2026-09-03；48 组件审计 + 4 同源族抽离 + lib actions 体系，组件直写业务表零残留 |
| 引力号 UID | ✅ | 2026-09-03；迁移 046（GR+8 位） |
| 架构文档单一真相源收敛（v4.0） | ✅ | 2026-09-03；断链清除，归属总表见 §4 |
| 规模化前置（CSP nonce / 分页缓存 / CI / 后台治理…） | 🔜 待办 | 触发条件与清单见 `docs/DEBTS.md`；缺陷复盘统一走 `docs/INCIDENTS.md` |

**防膨胀红线**：新增第 3 套分类体系或第 3 种图标方案前，必须先归一；**图标边界（2026-08-28 P2-3 收口）**：组件 UI 层图标一律 `lucide-react`，配置/数据层（可序列化静态配置，如 config.ts 导航/分类枚举）用 `lib/icons.ts` 字符串表，禁止混层；`lib/queries/` 任一文件超过 500 行或新增领域时按需拆分（平层文件取向，不留 re-export 桶，调用方直接改 import）；新增写操作必须先定「RLS / 列级权限 / 触发器 / Handler」归属。

---

*v4.0（2026-09-03）单一架构收敛：删除对已不存在 docs/SYSTEM-ARCHITECTURE.md、docs/DEVELOPER-HANDBOOK.md、docs/STYLE-SYSTEM.md 的全部引用；测试表述刷新（tests/ 收口）、queries-*.ts → lib/queries/；§8 演进表结构修复（缺陷记录迁 INCIDENTS INC-003）；补 09-03 大事记（商业化删除 / 组件分层 / 引力号 UID）；§4 内置 10 类单一架构归属总表。前版：v3.6（2026-09-03 详情页拆分 + hooks/ 柜）、v3.5（2026-08-29 029 title 列回收）。*
