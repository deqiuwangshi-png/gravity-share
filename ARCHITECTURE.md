# 引力（yinli）架构规范

> 版本：v2.6（极简）· 适用范围：本项目全部新增 / 重构代码
> 总纲一页纸见 [`docs/SYSTEM-ARCHITECTURE.md`](docs/SYSTEM-ARCHITECTURE.md)
> 核心主张：**四个柜子、三条规则、一个色板。架构是"涨"出来的，不是"设计"出来的。**

---

## 1. 技术栈基线

| 项 | 值 | 约定 |
|---|---|---|
| 框架 | Next.js 16（App Router） | 页面优先用 Server Component，需要交互才加 `"use client"`；查库页面用 `export const dynamic = "force-dynamic"` 避免 build 固化数据 |
| 语言 | TypeScript 5 `strict` | 禁止 `any`、`@ts-ignore`；新代码必须通过 `pnpm lint` + `pnpm build` |
| 样式 | Tailwind CSS 4 + 全局 CSS | 颜色只用 `styles/globals.css` 里的变量，不写色号；CSS 统一放 `styles/` |
| 包管理 | pnpm 11 | 禁止混用 npm/yarn，锁定提交 `pnpm-lock.yaml` |
| 路径别名 | `@/*` → 项目根 | 所有 import 用 `@/` 开头，禁止相对路径跨目录引用 |
| 数据边界 | **Supabase BaaS（Auth + Postgres + RLS + Storage）** | 读走 `lib/queries.ts`（双端 client 注入）；写靠 RLS（身份层强制）；业务规则在数据库触发器；**不引入自建后端** |

## 2. 四个柜子（目录就这四层）

```
app/          页面柜 —— 一页一个文件，文件名即网址
styles/       样式柜 —— 全部 CSS 统一管理，按访问区分目录
components/   组件柜 —— 用到两次才抽，平层放
lib/          数据柜 —— 数据访问、类型、配置、图标集中管理
supabase/     迁移柜 —— 数据库唯一真相（001-004，幂等可重跑）
```

```
yinli/
├── app/                        页面柜：只做 URL → 页面组装
│   ├── (marketing)/            落地页 / + 法律页
│   ├── (auth)/                 认证 /login /register /forgot-password
│   ├── (app)/                  应用区：/home /discover(+[id]) /categories(+[slug])
│   │                           /square(+[id]) /profile(+[id])
│   └── layout.tsx              根布局
├── styles/                     样式柜：全部 CSS 统一管理（import 一律 @/styles/...）
│   ├── globals.css             色板 + 全局基础（avatar-img / author-link）+ .logo-mark
│   ├── marketing/              落地页区：site / sections / legal
│   ├── auth/                   认证区：shell / card
│   └── app/                    应用区 13 文件：shell / discovery / list / modal /
│                               announcement / user-menu / settings / feed / square /
│                               detail / detail-comments / profile / notification
├── components/                 组件柜：访问区 + feature 双层
│   ├── common/                 跨区共享：logo / linkified-text / author-link / avatar-box
│   ├── marketing/              落地页区：legal-layout
│   └── app/                    应用区（feature 分层）
│       ├── shell/              应用壳：app-shell / app-aside / app-section / list-column /
│       │                       settings-panel / user-menu / publish-modal / notification-drawer /
│       │                       profile-view / profile-tabs
│       ├── discovery/          发现流：discovery-card / discover-filter /
│       │                       announcement-carousel / profile-post
│       └── square/             广场：square-feed / square-actions / square-comment-box
├── lib/                        数据柜：纯 TS，禁止 import 组件
│   ├── queries.ts              查询层：读（DTO 映射）+ 互动/通知操作（注入双端 client）
│   ├── storage.ts              图片上传 / 公开 URL 工具
│   ├── supabase/               client.ts（浏览器）/ server.ts（cookie 会话）
│   ├── types.ts                全局类型 + DTO（DiscoveryDTO / SquarePostDTO / CommentDTO / NotificationDTO）
│   ├── data.ts                 静态配置（分类 / 公告 / 热词——内容数据已上库）
│   ├── config.ts               导航 / 发布类型等配置
│   ├── icons.ts                图标单一来源
│   └── text.ts                 文本工具（URL / #标签提取 / 形态识别 / 相对时间）
├── supabase/migrations/        数据库迁移（001 users → 002 内容 → 003 互动通知 → 004 存储）
├── public/                     静态资源
├── docs/design/                设计原型归档
└── 配置文件
```

> 分层现状：访问区层（common / marketing / app）+ feature 层（app 下 shell / discovery / square）。何时再细分：某 feature 目录超过 10 个文件再继续分；页面超过 8 个再模块化。**不提前设计。**

## 3. 三条规则（就这些）

1. **数据只在 `lib/` 里拿** —— 页面与组件不手写 mock 数组；内容/评论/互动/通知全部读 `lib/queries.ts`（Supabase），`lib/data.ts` 仅存静态配置
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

**数据访问三层纪律**：RLS 管身份（谁能读写）→ 触发器管数据一致性（计数/通知）→ 业务校验（如推广合规）如需要走 Route Handler。写路径（发布/评论/点赞/收藏/关注/已读）由 client 组件直接 `insert/update`，安全依赖 RLS——**新增写操作必须先问「这条规则该在哪一层」**。

## 5. 命名与文件规范

| 项 | 规则 | 示例 |
|---|---|---|
| 页面文件 | 固定名 `page.tsx` / `layout.tsx` | `app/(app)/home/page.tsx` |
| 组件文件 | PascalCase，一个文件一个组件；按「访问区 → feature」两层归入 `components/<区>/<feature>/`，跨区共享放 `common/` | `components/app/square/square-actions.tsx` |
| 私有文件 | `_` 前缀（不参与路由） | `(auth)/_components/auth-form.tsx` |
| 类型 | 组件 Props 用 `XxxProps` 命名；展示模型用 `XxxDTO`（queries.ts 统一映射） | `type AppSectionProps` / `DiscoveryDTO` |
| 常量 | UPPER_SNAKE_CASE | `MARKETING_CATEGORIES` |
| 样式文件 | 按访问区归入 `styles/<区>/`，文件名 = 组件/区块维度，单文件 ≤ 400 行 | `styles/app/settings.css` |
| 数据库 | 迁移文件 `supabase/migrations/NNN-*.sql`，幂等可重跑，头部注释动机 | `002-content-seed.sql` |

### 5.1 Server / Client 边界

- 默认 Server Component；需要交互状态 / 浏览器 API 时才加 `"use client"`
- 查库的 Server 页面（/home、/categories、marketing、/square/[id]、/profile）加 `export const dynamic = "force-dynamic"`（防 build 时固化数据）
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
4. **数据只从 `lib/queries.ts` / `lib/data.ts` 拿**，颜色只从色板取
5. **文档同步**：结构有重大调整时更新本文档与一页纸版（R4 提交自检）

## 8. 阶段边界与演进状态

**演进决策（2026-08-21）**：前端模拟优先 → 已接 Supabase BaaS，数据层上库完成。

| 范围 | 状态 | 说明 |
|---|---|---|
| 界面布局与前端治理 | ✅ 阶段 0 完成 | 页面、组件、样式、死链清理 |
| Supabase 接入（Auth + Postgres + Storage） | ✅ 已完成 | 见下「已落地里程碑」 |
| 认证基座（1a） | ✅ | Auth + cookie 会话 + proxy.ts 守卫 + public.users 触发器建档 + RLS |
| 用户资料完整化（2a） | ✅ | 设置面板昵称/简介接库；user-menu 读 users 表 |
| 内容上库（2b） | ✅ | 3 内容表 + seed + 查询层 + 发布/评论写库；双内容池退役 |
| 互动与通知（2c） | ✅ | likes/favorites/follows/notifications + 触发器；通知抽屉接库；他人主页 /profile/[id] |
| 图片存储（S） | ✅ | avatars/covers/posts 公开桶 + 上传/展示 + 全站头像 |
| 规模化前置（CSP / 分页缓存 / 测试 / 迁移 CLI 等 9 项） | 🔜 待办 | 触发条件与方案见 `docs/SYSTEM-ARCHITECTURE.md` §七「规模化前置清单」 |

**防膨胀红线**：新增第 3 套分类体系或第 3 种图标方案前，必须先归一；`lib/queries.ts` 超过 500 行或新增领域时拆 `lib/db/`；新增写操作必须先定「RLS / 触发器 / Handler」归属。

---

*本规范 v2.6 于 2026-08-21 修订（目录树同步 2a-2c 与图片存储全部演进：lib 增 queries/storage/supabase，删双内容池；components 增 author-link/avatar-box/notification-drawer/profile-view 等；styles/app 增 profile/notification；新增 supabase/migrations 迁移柜；数据边界从 mock 改为 Supabase BaaS；§8 演进状态更新）。v2.5 同步 square 详情与 linkified-text；v2.4 按 feature 分 shell/discovery/square；v2.3 组件按访问区分目录；v2.2 样式统一归入 `styles/`；v2.1 确立「前端模拟优先」边界。争议裁决原则：简单优先。*
