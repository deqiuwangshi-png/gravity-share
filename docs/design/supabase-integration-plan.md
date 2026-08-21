# 阶段 1 实施架构方案 · Supabase 集成

> 版本：v1.0（开发前方案，待确认）· 日期：2026-08-21
> 前置：auth-architecture.md v2（Supabase 路线定稿）· ARCHITECTURE.md §8（后端/数据库解冻）
> 原则：小步快跑——**1a 认证基座（本轮）→ 1b 数据上库（另行排期）**，每步验证后再继续

---

## 一、分期边界

| 分期 | 范围 | 状态 |
|---|---|---|
| **1a · 认证基座** | 依赖 + env + 双客户端 + proxy 守卫 + 登录/注册接 SDK + 我的账户接 session + 个人主页接 profile | **本轮** |
| **1b · 数据上库** | 业务表（discoveries/square_posts/comments）+ RLS + 查询替换 + 发布写库 + 内容池退役 | 另行排期确认 |
| 不动 | 四柜结构、样式体系、现有 UI 设计、mock 数据形态（1b 前保留） | — |

---

## 二、文件结构（新增，极简）

```
lib/supabase/
├── client.ts    浏览器客户端：createClient（NEXT_PUBLIC env），登录/注册/登出
└── server.ts    SSR 客户端：@supabase/ssr createServerClient（cookie），守卫/服务端读 session
proxy.ts         根目录守卫（Next 16；如 API 为 middleware 则按其规范）
.env.local       URL + publishable key（不入 git）
```

> 不建 lib/api、不引入 react-query 等状态库——认证期只需两个客户端工厂 + 守卫。

---

## 三、数据模型（Postgres）

### 表 1：`auth.users`（Supabase 内置，不碰）

### 表 2：`public.users`（个人资料，1a 建表）

```sql
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '引力用户',
  bio text default '',
  avatar_url text,
  points int not null default 0,
  created_at timestamptz default now()
);
-- RLS：用户只能读写自己的行
alter table public.users enable row level security;
create policy "users_self" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);
```

### 表 3-5：业务表（1b 再建，此处仅列模型）

`discoveries` / `square_posts` / `comments` —— 字段映射现有 DiscoveryItem / SquarePost / Comment 类型；RLS：公开读 + 仅作者写。

---

## 四、认证流设计

| 环节 | 实现 |
|---|---|
| 注册 | 表单 → `supabase.auth.signUp(email, password)`；成功后自动登录（若邮箱确认开启则跳"请查收邮件"） |
| 登录 | `signInWithPassword`；错误文案展示（邮箱不存在/密码错误） |
| 登出 | `signOut()` → 回 `/login` |
| 会话 | `@supabase/ssr` cookie；服务端 `server.ts` 读 cookies → `getUser()` |
| 守卫 | `proxy.ts`：`(app)/*` 未登录 → `/login`；`(auth)/*` 已登录 → `/home` |
| 我的账户 | user-menu 显示 `session.user.email` 昵称；登出按钮生效 |
| 个人主页 | profile 数据源：`public.users`（无记录时创建默认行并保留 mock 兜底） |

**登录/注册页**：现有 `auth-form.tsx` 的 UI（双栏品牌面板 + 表单）**完全保留**，仅提交逻辑换 SDK；社交登录按钮（GitHub）待配置后接入，本期先邮箱密码。

---

## 五、安全红线（强制）

1. `service_role` key **绝不写入前端代码/env**（仅服务端 admin 操作才用，本期不用）；
2. RLS 策略**先于任何数据写入**配置（users 表落地即配）；
3. `.env.local` 确认在 `.gitignore`；
4. 邮箱密码走 Supabase 托管哈希（不自己处理密码）。

---

## 六、验证方式（每步执行）

| 步骤 | 验证 |
|---|---|
| 依赖 + env | `pnpm build` 通过；env 无泄漏（grep .env 不入包） |
| 双客户端 | 客户端工厂可实例化（登录页加载无报错） |
| 守卫 | 未登录访问 `/home` → 302 `/login`；登录后回 `/home` |
| 认证流 | dev 环境真实注册/登录/登出跑通；`user-menu` 显示登录用户 |
| profile | 个人主页显示登录用户昵称/头像；新用户自动建默认行 |

---

## 七、待确认决策点

1. **分期**：本轮只做 1a 认证基座（推荐），1b 数据上库另行排期——确认？
2. **邮箱确认**：Supabase 默认注册需邮箱验证——本期开启（推荐，安全）还是临时关闭（dev 快捷）？
3. **OAuth**：本期仅邮箱密码（推荐，GitHub 需你提供 OAuth app 凭证后二期接入）——确认？
4. **个人主页数据**：登录用户 profile 从 `public.users` 读；**新用户首次登录自动建默认行**（推荐）——确认？
5. **mock 保留**：1a 期间发现流/广场/评论仍用 mock（不动）——确认？

确认后按 1a 清单落地（装依赖 → env → 客户端 → 守卫 → 认证流 → 验证）。
