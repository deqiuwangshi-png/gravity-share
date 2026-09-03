# 引力（yinli）架构规范

> 版本：v2.8（极简）· 适用范围：本项目全部新增 / 重构代码
> 总纲一页纸见 [`docs/SYSTEM-ARCHITECTURE.md`](docs/SYSTEM-ARCHITECTURE.md)
> 核心主张：**四个柜子、三条规则、一个色板。架构是"涨"出来的，不是"设计"出来的。**

---

## 1. 技术栈基线

| 项 | 值 | 约定 |
|---|---|---|
| 框架 | Next.js 16（App Router） | 页面优先用 Server Component，需要交互才加 `"use client"`；查库页面用 `export const dynamic = "force-dynamic"` 避免 build 固化数据 |
| 语言 | TypeScript 5 `strict` | 禁止 `any`、`@ts-ignore`；新代码必须通过 `pnpm lint` + `pnpm build` |
| 样式 | Tailwind CSS 4 + 全局 CSS | 颜色只用 `styles/globals.css` 里的变量，不写色号；CSS 统一放 `styles/`，单文件 ≤ 400 行 |
| 包管理 | pnpm 11 | 禁止混用 npm/yarn，锁定提交 `pnpm-lock.yaml` |
| 路径别名 | `@/*` → 项目根 | 所有 import 用 `@/` 开头，禁止相对路径跨目录引用 |
| 数据边界 | **Supabase BaaS（Auth + Postgres RLS + Storage）** | 读走 `lib/queries-*.ts`（S3 拆分 2026-08-29，双端 client 注入）；写靠 RLS + 列级权限；一致性靠触发器；服务端操作走 `lib/supabase/admin.ts`（service_role，**仅 route handler，严禁客户端 import**）；**不引入自建后端** |
| 第三方登录 | GitHub + Google（Supabase OAuth，PKCE） | 回调统一走 `/auth/callback`（code → session）；provider 清单在 `lib/config.ts` 的 `OAUTH_PROVIDERS` |
| 测试 | vitest（纯函数冒烟） | `pnpm test`；测试文件 `lib/*.test.ts`（已 exclude 出 tsconfig，不影响 build） |

## 2. 四个柜子（目录就这四层）

```
app/          页面柜 —— 一页一个文件，文件名即网址
styles/       样式柜 —— 全部 CSS 统一管理，按访问区分目录
components/   组件柜 —— 用到两次才抽，按「访问区 → feature」双层；`ui/` 为无业务纯 UI 层（Button/DropdownMenu/状态件，禁 import 业务，业务组件组合它）
lib/          数据柜 —— 数据访问、类型、配置、图标、文本工具集中管理
supabase/     迁移柜 —— 数据库唯一真相（001-043，幂等可重跑；手动复制 SQL 到 Dashboard 执行，不引入 CLI）
```


> 分层现状：访问区层（common / marketing / app）+ 应用区共享层（app/common）+ feature 层（app 下 shell / discovery / square）。何时再细分：某 feature 目录超过 10 个文件再继续分；页面超过 8 个再模块化。**不提前设计。**

## 3. 三条规则（就这些）

1. **数据只在 `lib/` 里拿** —— 页面与组件不手写 mock 数组；内容/评论/互动/通知全部读 `lib/queries-*.ts`（Supabase），`lib/data.ts` 仅存静态配置
2. **重复第二次才抽组件** —— 第一次内联，出现第二次再抽到 `components/`
3. **颜色只用变量** —— 全站色值集中在 `styles/globals.css` 色板，组件不写 `#hex`

## 4. 依赖方向（单向流动）

```
app（页面）
   ↓
components（共享组件）
   ↓
lib（queries / storage / supabase / types / config / icons / text）—— 最底层，谁都能依赖
   ↓
Supabase（Postgres RLS + Storage）—— 通过 lib/supabase 双客户端
```

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
| 私有文件 | `_` 前缀（不参与路由） | `(auth)/_components/auth-form.tsx` |
| 类型 | 组件 Props 用 `XxxProps` 命名（简单组件可内联）；展示模型用 `XxxDTO`（queries-*.ts 统一映射，集中在 lib/types.ts） | `SquarePostDTO` / `Announcement`（均在 lib/types.ts） |
| 常量 | UPPER_SNAKE_CASE | `MARKETING_CATEGORIES` |
| 样式文件 | 按访问区归入 `styles/<区>/`，文件名 = 组件/区块维度，单文件 ≤ 400 行 | `styles/app/promo.css` |
| 数据库 | 迁移文件 `supabase/migrations/NNN-*.sql`，幂等可重跑，头部注释动机；**手动复制 SQL 到 Supabase Dashboard 执行（不引入 CLI）** | `002-content-seed.sql` |

### 5.1 Server / Client 边界

- 默认 Server Component；需要交互状态 / 浏览器 API 时才加 `"use client"`
- 查库的 Server 页面加 `export const dynamic = "force-dynamic"`（防 build 时固化数据）；列表由 client 组件（SquareFeed 等）拉取则无需
- Client 组件尽量下沉到叶子节点，避免客户端化整棵子树

## 6. 色板（全站 15 个颜色变量，定义在 `globals.css`）

| 分类 | 变量 | 色值 |
|---|---|---|
| 主色 | `--primary` `#006855` / `--primary-dark` `#005346` / `--primary-soft` `#e9f3ef` / `--primary-subtle` `#f0f6f3` / `--on-primary` `#ffffff` | 按钮、链接、选中、标签底 |
| 辅助 | `--accent` `#f3c969` / `--accent-soft` `#faf4df` / `--on-accent` `#8b6b20` | 金色点缀、商业标签 |
| 背景 | `--background` `#f7f8f6` / `--surface` `#ffffff` / `--bg-raised` `#fbfcfb` / `--bg-hover` `#f0f3f1` | 页面底、卡片、侧边栏、hover |
| 文字 | `--foreground` `#111816` / `--text-muted` `#68736f` / `--text-soft` `#8a938f` / `--text-disabled` `#b4bcb8` | 主文、说明、弱提示、禁用 |
| 边框 | `--border` `#e4e8e5` / `--border-primary` `#a9d0c5` | 常规边框、主色态边框 |

> 语义色（成功/警告/错误）**用到再加**；`rgba()` 阴影保留（属 `--shadow-*`，非色值令牌）。

## 7. 团队协作约定

1. **新增文件先定位**：页面 → `app/`；共享组件 → `components/`；数据/类型/配置 → `lib/`；表结构/触发器 → `supabase/migrations/`
2. **提交前自检**：`pnpm lint` + `pnpm build` 通过；不新建目录（除非触发 §2 的分层条件）
3. **重复第二次就抽象**，第一次允许内联
4. **数据只从 `lib/queries-*.ts` / `lib/data.ts` 拿**，颜色只从色板取
5. **文档同步**：结构有重大调整时更新本文档与一页纸版（R4 提交自检）

### 7.5 维护方案（治理护栏）

架构防腐化策略见 [`docs/DEVELOPER-HANDBOOK.md`](docs/DEVELOPER-HANDBOOK.md) §2.4（治理体系）：
- **日常改动后跑 `pnpm check`**（eslint + 测试 + 治理脚本 + 死代码检测），新死代码当场清理；
- **债务登记**：剩余已知债见 `docs/DEVELOPER-HANDBOOK.md` §4，经确认后分批清理；
- **迁移手动执行**（用户决策，不引入 CLI）：执行后迁移文件头加 `-- ✅ 已执行 YYYY-MM-DD` 标记；
- AI 改动遵守 AGENTS.md「维护与完成定义（DoD）」。

## 8. 阶段边界与演进状态

**演进决策（2026-08-21）**：前端模拟优先 → 已接 Supabase BaaS，数据层上库完成 → 2026-08-22 认证与安全闭环。

| 范围 | 状态 | 说明 |
|---|---|---|

| 发布标注移除 + 定价区下线（2026-08-31） | ✅ | 发布页删除「包含推广/我的原创」两个可选标注（新帖统一 post_type=share，存量机会/来源标识保留渲染，库 015 不动）；落地页定价三卡整体下线，改为免费口径文案（「目前完全免费，未来付费会提前公告」），pricing.css 与 PRICING_TIERS 一并删除 |
| 内容头三点菜单右对齐修复（2026-09-03） | ✅ | 缺陷成因：P2-详情页批次（09-02）把推右逻辑写成容器任意变体 `[&>.comment-menu]:ml-auto`，而后续 P-菜单批次把 PostMenu 根元素原子化为 `relative shrink-0` 时丢掉了 `comment-menu` 钩子类名 → 选择器永不命中，菜单紧邻姓名未贴右边缘（5 处均失效：square-post-view / comment-section×2 / profile-square-post / profile-comment）。**方案 A（用户拍板）**：取消隔空钩子，改 PostMenu 根元素内置 `ml-auto`（5 处调用均为「头像 / 姓名+时间 / 菜单」同构布局，无例外），5 处失效选择器删除；不做光学负边距（用户选择保持现状，按钮 26px 热区完整）。零新依赖 |

| 规模化前置（CSP / 分页缓存 / 迁移 CLI 等） | 🔜 待办 | 触发条件与方案见 `docs/SYSTEM-ARCHITECTURE.md` §七；迁移 CLI 经用户决策改用手动复制 |

**防膨胀红线**：新增第 3 套分类体系或第 3 种图标方案前，必须先归一；**图标边界（2026-08-28 P2-3 收口）**：组件 UI 层图标一律 `lucide-react`，配置/数据层（可序列化静态配置，如 config.ts 导航/分类枚举）用 `lib/icons.ts` 字符串表，禁止混层；`lib/queries-*.ts` 任一超过 500 行或新增领域时按需拆分（平层文件取向，不留 re-export 桶，调用方直接改 import）；新增写操作必须先定「RLS / 列级权限 / 触发器 / Handler」归属。

---

*本规范 v3.5 于 2026-08-29 修订（029 title 列回收：`square_posts.title` drop，前端 6 处残留 + 测试 + 3 组样式全部清理；详情页 SEO 回落「作者 的话题」）。