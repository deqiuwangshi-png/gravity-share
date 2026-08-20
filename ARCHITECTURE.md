# 引力（yinli）架构规范

> 版本：v2.0（极简）· 适用范围：本项目全部新增 / 重构代码
> 总纲一页纸见 [`docs/SYSTEM-ARCHITECTURE.md`](docs/SYSTEM-ARCHITECTURE.md)
> 核心主张：**三个柜子、三条规则、一个色板。架构是"涨"出来的，不是"设计"出来的。**

---

## 1. 技术栈基线

| 项 | 值 | 约定 |
|---|---|---|
| 框架 | Next.js 16（App Router） | 页面优先用 Server Component，只有需要交互状态才加 `"use client"` |
| 语言 | TypeScript 5 `strict` | 禁止 `any`、`@ts-ignore`；新代码必须通过 `pnpm lint` + `pnpm build` |
| 样式 | Tailwind CSS 4 + 全局 CSS | 颜色只用 `globals.css` 里的变量，不写色号 |
| 包管理 | pnpm 11 | 禁止混用 npm/yarn，锁定提交 `pnpm-lock.yaml` |
| 路径别名 | `@/*` → 项目根 | 所有 import 用 `@/` 开头，禁止相对路径跨目录引用 |

## 2. 三个柜子（目录就这三层）

```
app/          页面柜 —— 一页一个文件，文件名即网址
components/   组件柜 —— 用到两次才抽，平层放
lib/          数据柜 —— 数据、类型、配置集中管理
```

```
yinli/
├── app/                        页面柜：只做 URL → 页面组装
│   ├── (marketing)/            落地页 /（marketing.css + layout + page）
│   ├── (auth)/                 认证 /login /register（auth.css + layout + _components）
│   ├── (app)/                  应用主页 /home（app.css + layout + home/）
│   ├── layout.tsx              根布局
│   └── globals.css             色板（15 个颜色变量）+ 全局基础 + .logo-mark
├── components/                 组件柜：4 个共享组件（平层）
│   ├── logo.tsx  app-shell.tsx  app-section.tsx  list-column.tsx
├── lib/                        数据柜：纯 TS，禁止 import 组件
│   ├── data.ts   全部 mock 数据（未来接后端只改这里）
│   ├── types.ts  全局类型
│   └── config.ts 导航 / 发布类型等配置
├── public/                     静态资源
├── docs/design/                设计原型归档
└── 配置文件
```

> 何时分层：`components/` 超过 10 个文件再分子目录；页面超过 8 个再模块化。**不提前设计。**

## 3. 三条规则（就这些）

1. **数据只在 `lib/` 里** —— 页面与组件不手写 mock 数组
2. **重复第二次才抽组件** —— 第一次内联，出现第二次再抽到 `components/`
3. **颜色只用变量** —— 全站色值集中在 `globals.css` 色板，组件不写 `#hex`

## 4. 依赖方向（单向流动）

```
app（页面）
   ↓
components（共享组件）
   ↓
lib（data / types / config）—— 最底层，谁都能依赖
```

禁止：`lib/` import 组件、组件之间互相 import（共享一律走 `components/`）、页面互相 import、跨 route group 引用。

## 5. 命名与文件规范

| 项 | 规则 | 示例 |
|---|---|---|
| 页面文件 | 固定名 `page.tsx` / `layout.tsx` | `app/(app)/home/page.tsx` |
| 组件文件 | PascalCase，一个文件一个组件 | `app-shell.tsx` |
| 私有文件 | `_` 前缀（不参与路由） | `(auth)/_components/auth-form.tsx` |
| 类型 | 组件 Props 用 `XxxProps` 命名 | `type AppSectionProps` |
| 常量 | UPPER_SNAKE_CASE | `MARKETING_CATEGORIES` |

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

---

*本规范 v2.0 于 2026-08-20 由 v1.0 精简而来（取消目录细分、色板收敛为 15 变量、规则减至 3 条）。争议裁决原则：简单优先。*
