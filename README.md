# 引力（yinli）

一个开放的发现与连接平台：好文章、好工具、好作品、好课程、好服务——让分散在互联网各处的价值被更多人发现。

> 当前为**前端模拟（mock）阶段**：界面与交互优先，后端、数据库、认证暂不开发。边界与触发条件见 [ARCHITECTURE.md](ARCHITECTURE.md) §8。

## 技术栈

| 项 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router，Server Component 优先） |
| 语言 | TypeScript 5 strict（禁止 `any` / `@ts-ignore`） |
| 样式 | Tailwind CSS 4 + CSS 变量色板（`styles/globals.css`） |
| 包管理 | pnpm 11 |

## 目录结构（四个柜子）

```
app/          页面柜 —— 一页一个文件，文件名即网址
styles/       样式柜 —— 全部 CSS 统一管理，按访问区分目录（单文件 ≤ 400 行）
components/   组件柜 —— 访问区 + feature 双层（common/marketing/app），用到两次才抽
lib/          数据柜 —— 数据、类型、配置、图标、文本工具、内容池（store×2）
```

## 快速开始

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm lint       # ESLint 检查
pnpm build      # 生产构建（如遇 NODE_OPTIONS 干扰：env -u NODE_OPTIONS pnpm build）
```

## 访问区

| 访问区 | 路由 | 说明 |
|---|---|---|
| 落地页 | `/` `/about` `/help` `/terms` `/privacy` | 公开 |
| 认证 | `/login` `/register` `/forgot-password` | Supabase Auth（邮箱密码 + 邮箱验证） |
| 应用主页 | `/home` `/discover(/[id])` `/categories(/[slug])` `/square(/[id])` `/profile(/[id])` | 需登录（proxy.ts 守卫）；`/recommend` 已并入首页（308 → `/home`） |

> 数据：Supabase BaaS（Postgres + RLS + Storage），迁移见 `supabase/migrations/`（001-004）。配置需 `.env.local`（URL + publishable key）。

## 文档

- [ARCHITECTURE.md](ARCHITECTURE.md) —— 架构规范（v2.6：四个柜子、三条规则、数据层纪律）
- [docs/SYSTEM-ARCHITECTURE.md](docs/SYSTEM-ARCHITECTURE.md) —— 一页纸版
- [docs/ARCHITECTURE-GOVERNANCE.md](docs/ARCHITECTURE-GOVERNANCE.md) —— 前端治理与演进进度
- [docs/ARCHITECTURE-REVIEW.md](docs/ARCHITECTURE-REVIEW.md) —— 2026-08 架构评审报告（v3）
