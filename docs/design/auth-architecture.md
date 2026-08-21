# 认证与后端架构方案 · Supabase 路线

> 版本：v2.0 · 日期：2026-08-21 · 状态：**✅ 路线已确认（Supabase 托管 BaaS）**
> v1（Auth.js 自托管路线）已废弃；本版为定稿路线
> 原则：**不造轮子**——认证/数据库/存储/安全全用 Supabase 托管服务，项目只做接线

---

## 一、路线定稿：Supabase（托管 BaaS）

**决策（2026-08-21）：认证与后端基座采用 Supabase 托管服务**，替代自托管 Auth.js + Drizzle 路线。

| 能力 | Supabase 提供 | 项目接入 |
|---|---|---|
| 认证 | Auth（GoTrue）：邮箱密码 / OAuth（GitHub 起步，微信后加）/ 手机 | 登录/注册页接 SDK |
| 数据库 | Postgres 托管 + 建表 | users 表原生；业务表（discoveries/square/评论）后续建 |
| 存储 | Storage（头像/封面图上传） | 个人主页「更换封面」未来接 |
| 安全 | RLS（行级权限） | **必须为每张表配置策略**（安全基线） |
| 实时 | Realtime | 未来广场实时讨论可用（P2） |

免费层：500MB 数据库 / 50k MAU / 暂停机制（一周不活跃暂停）——MVP 够用，暂停机制需知悉。

---

## 二、接入步骤（Supabase 官方指南，映射到本项目）

### Step 1 · 安装依赖

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

### Step 2 · Supabase 客户端封装（shadcn registry 块）

```bash
npx shadcn@latest add @supabase/supabase-client-nextjs
```

- 提供 `createClient()` 服务端工厂（读 cookies）与浏览器工厂；
- ⚠️ 只取 Supabase 客户端封装，**不整套引入 shadcn 组件库**——保持项目极简全局 CSS 体系（现有色板/组件不动）。

### Step 3 · 环境变量（`.env.local`，绝不提交 git）

```
NEXT_PUBLIC_SUPABASE_URL=https://cpovqlochkomazyrrxvw.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_****
```

> ⚠️ 安全提醒：`NEXT_PUBLIC_` 前缀 = 浏览器可见（publishable key 设计公开），**数据安全完全依赖 RLS**；`.env.local` 确认在 `.gitignore`。

### Step 4 · Agent Skills（可选）

本项目已具备 Supabase 相关开发能力，可跳过。

---

## 三、认证集成设计

```
登录/注册页（现有 mock 表单改造）
  → supabase.auth.signUp / signInWithPassword / signInWithOAuth
  → 会话由 @supabase/ssr 管理（cookie）
  → 守卫：根目录 proxy.ts 校验 session（getUser()），未登录跳 /login
```

| 环节 | 做法 |
|---|---|
| 登录/注册表单 | 保留现有 UI 设计，提交逻辑换 Supabase SDK |
| 会话 | `@supabase/ssr` cookie 会话（服务端 `createClient` 读 cookies） |
| 守卫 | `proxy.ts`：`(app)/*` 需登录；`(auth)/*` 已登录跳 /home（Next 16 根目录 proxy） |
| 「我的账户」 | 头像菜单读 `session.user`；个人主页昵称/头像/设置 tab 接真实用户 |
| 发布作者 | `author` 写真实用户 id/昵称（接后端时一并迁移，见 P1） |

### RLS 安全基线（落地必做）

- `users` 表：用户只能读写自己的行（`auth.uid() = id`）；
- 业务表（discoveries / square_posts / comments）：公开读 + 仅作者写；
- 关闭表的匿名直写（`public` 无策略即拒绝）。

---

## 四、落地清单（阶段 1，启动时执行）

| # | 事项 | 说明 |
|---|---|---|
| 1 | `pnpm add @supabase/supabase-js @supabase/ssr` | 依赖 |
| 2 | `.env.local` 写入 URL + publishable key | 确认 .gitignore |
| 3 | shadcn registry 加客户端封装（仅取封装） | 或手写 20 行 createClient 工厂 |
| 4 | 建表：users（Supabase 自带）+ 业务表 SQL | SQL 编辑器执行 + RLS 策略 |
| 5 | `proxy.ts` 守卫 | 路由保护 |
| 6 | 登录/注册页接 Supabase SDK | 保留 UI |
| 7 | 「我的账户」接 session.user | 个人主页联动 |
| 8 | RLS 策略配置 | 安全基线，全部表 |

**当前状态**：方案已定稿；代码落地等待「启动阶段 1」指令（对应 ARCHITECTURE.md §8 触发条件）。

---

## 五、与既有架构的关系

- 四柜结构不变：`lib/` 新增 `supabase/` 客户端模块（或 `lib/supabase.ts` 单文件）；
- 数据边界更新：mock 内容池（discovery/square-store）→ 阶段 1 逐步换 Supabase 查询（保留前端形态）；
- 冻结清单解冻项：后端/数据库/API 层（认证随行）；
- 仍冻结：无（阶段 1 启动后按清单推进）。
