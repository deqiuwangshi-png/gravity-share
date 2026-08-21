# 引力（yinli）架构规范

> 版本：v2.5（极简）· 适用范围：本项目全部新增 / 重构代码
> 总纲一页纸见 [`docs/SYSTEM-ARCHITECTURE.md`](docs/SYSTEM-ARCHITECTURE.md)
> 核心主张：**四个柜子、三条规则、一个色板。架构是"涨"出来的，不是"设计"出来的。**

---

## 1. 技术栈基线

| 项 | 值 | 约定 |
|---|---|---|
| 框架 | Next.js 16（App Router） | 页面优先用 Server Component，只有需要交互状态才加 `"use client"` |
| 语言 | TypeScript 5 `strict` | 禁止 `any`、`@ts-ignore`；新代码必须通过 `pnpm lint` + `pnpm build` |
| 样式 | Tailwind CSS 4 + 全局 CSS | 颜色只用 `styles/globals.css` 里的变量，不写色号；CSS 统一放 `styles/` |
| 包管理 | pnpm 11 | 禁止混用 npm/yarn，锁定提交 `pnpm-lock.yaml` |
| 路径别名 | `@/*` → 项目根 | 所有 import 用 `@/` 开头，禁止相对路径跨目录引用 |
| 数据边界 | **前端模拟（mock）优先** | 阶段 0 不接入后端与数据库；接后端为独立阶段，触发条件见 §8 |

## 2. 四个柜子（目录就这四层）

```
app/          页面柜 —— 一页一个文件，文件名即网址
styles/       样式柜 —— 全部 CSS 统一管理，按访问区分目录
components/   组件柜 —— 用到两次才抽，平层放
lib/          数据柜 —— 数据、类型、配置、图标集中管理
```

```
yinli/
├── app/                        页面柜：只做 URL → 页面组装
│   ├── (marketing)/            落地页 /
│   ├── (auth)/                 认证 /login /register
│   ├── (app)/                  应用主页 /home
│   └── layout.tsx              根布局
├── styles/                     样式柜：全部 CSS 统一管理（import 一律 @/styles/...）
│   ├── globals.css             色板（15 个颜色变量）+ 全局基础 + .logo-mark
│   ├── marketing/              落地页区：site / sections / legal
│   ├── auth/                   认证区：shell / card
│   └── app/                    应用主页区：shell / discovery / list / modal /
│                               announcement / user-menu / settings / feed / square /
│                               detail / detail-comments
├── components/                 组件柜：访问区 + feature 双层
│   ├── common/                 跨区共享：logo / linkified-text（URL 链接渲染）
│   ├── marketing/              落地页区：legal-layout
│   └── app/                    应用主页区（feature 分层）
│       ├── shell/              应用壳：app-shell / app-aside / app-section /
│       │                       list-column / settings-panel / user-menu / publish-modal
│       ├── discovery/          发现流：discovery-card / discover-filter /
│       │                       announcement-carousel
│       └── square/             广场：square-feed / square-actions / square-comment-box
├── lib/                        数据柜：纯 TS，禁止 import 组件
│   ├── data.ts                 全部 mock 数据（seed）
│   ├── types.ts                全局类型
│   ├── config.ts               导航 / 发布类型等配置
│   ├── icons.ts                图标单一来源
│   ├── text.ts                 文本工具（URL / #标签提取 / 形态识别）
│   ├── discovery-store.ts      发现内容池（内存态，发布实时联动）
│   └── square-store.ts         广场话题池（内存态，发布实时联动）
├── public/                     静态资源
├── docs/design/                设计原型归档
└── 配置文件
```

> 分层现状：访问区层（common / marketing / app）+ feature 层（app 下 shell / discovery / square）。何时再细分：某 feature 目录超过 10 个文件再继续分；页面超过 8 个再模块化。**不提前设计。**

## 3. 三条规则（就这些）

1. **数据只在 `lib/` 里** —— 页面与组件不手写 mock 数组；当前全部为 mock 常量，**接后端是独立阶段**（见 §8），届时另行设计数据访问层，不承诺页面零改动
2. **重复第二次才抽组件** —— 第一次内联，出现第二次再抽到 `components/`
3. **颜色只用变量** —— 全站色值集中在 `styles/globals.css` 色板，组件不写 `#hex`

## 4. 依赖方向（单向流动）

```
app（页面）
   ↓
components（共享组件）
   ↓
lib（data / types / config / icons / text / store×2）—— 最底层，谁都能依赖
```

禁止：`lib/` import 组件、组件之间互相 import（共享一律走 `components/`）、页面互相 import、跨 route group 引用。

> 内容池（discovery-store / square-store）：client 内存态（刷新还原，mock 边界）。发布 → `dispatchEvent` 事件 → 消费端重渲染，**不引入状态库**。接后端时整体替换为数据访问层（见 §8）。

## 5. 命名与文件规范

| 项 | 规则 | 示例 |
|---|---|---|
| 页面文件 | 固定名 `page.tsx` / `layout.tsx` | `app/(app)/home/page.tsx` |
| 组件文件 | PascalCase，一个文件一个组件；按「访问区 → feature」两层归入 `components/<区>/<feature>/`，跨区共享放 `common/` | `components/app/square/square-actions.tsx` |
| 私有文件 | `_` 前缀（不参与路由） | `(auth)/_components/auth-form.tsx` |
| 类型 | 组件 Props 用 `XxxProps` 命名 | `type AppSectionProps` |
| 常量 | UPPER_SNAKE_CASE | `MARKETING_CATEGORIES` |
| 样式文件 | 按访问区归入 `styles/<区>/`，文件名 = 组件/区块维度，单文件 ≤ 400 行 | `styles/app/settings.css` |

### 5.1 Server / Client 边界

- 默认 Server Component；需要交互状态 / 浏览器 API 时才加 `"use client"`
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

1. **新增文件先定位**：页面 → `app/`；共享组件 → `components/`；数据/类型/配置 → `lib/`
2. **提交前自检**：`pnpm lint` 通过；不新建目录（除非触发 §2 的分层条件）
3. **重复第二次就抽象**，第一次允许内联
4. **数据只从 `lib/data.ts` 拿**，颜色只从色板取
5. **文档同步**：结构有重大调整时更新本文档与一页纸版

## 8. 阶段边界与冻结清单（v2.1 新增）

**决策（2026-08-21）：前端模拟优先。** 界面布局建设完成并验收前，不启动后端、数据库、认证、API 的任何开发。

| 范围 | 状态 | 说明 |
|---|---|---|
| 界面布局与前端治理 | ✅ 当前阶段（阶段 0） | 页面、组件、样式、数据 mock、死链清理 |
| 后端 / 数据库 / API 层 | ⛔ 冻结 | 不建 `lib/api`、不写 fetch、不加依赖 |
| 认证与登录守卫 | ⏸ 推迟 | 无后端无 session；文档如实标注「当前无守卫」，守卫列为布局验收后的 P1 评审项 |
| 数据访问层异步化 | ⛔ 冻结 | 同步 mock 常量保持现状；接后端时再设计，不提前铺路 |

**接后端触发条件（两个同时满足才启动阶段 1）**：
1. 阶段 0 界面布局验收通过（验收标准见 `docs/ARCHITECTURE-GOVERNANCE.md`）
2. 业务方明确确认启动后端开发

**防膨胀红线**：新增第 3 套分类体系或第 3 种图标方案前，必须先归一（当前已有 4 套分类、3 种图标写法）。

---

*本规范 v2.5 于 2026-08-21 修订（目录树同步今日全部演进：styles/app 增 detail.css 与 detail-comments.css；components 增 common/linkified-text、shell/publish-modal，square 组件更新；lib 增 text.ts 与双内容池；内容池事件联动机制入 §4）。v2.4 按 feature 分 shell/discovery/square；v2.3 组件按访问区分目录；v2.2 样式统一归入 `styles/`；v2.1 确立「前端模拟优先」边界。争议裁决原则：简单优先。*
