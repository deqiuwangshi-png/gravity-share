# 引力（yinli）

一个开放的发现与连接平台——好文章、好工具、好作品、好课程、好服务，让分散在互联网各处的价值，被更多人发现。

> 互联网不缺好东西，缺的是让它们相遇的地方。

---

## 它是做什么的

好东西很多，但都散落在各自的角落：文章在公众号，工具在 GitHub，课程在知识平台，作品在个人主页。你常常记得"有这么个好东西"，却想不起在哪里见过。

引力把**发现**和**分享**连在一起：

- **发现**：搜索、浏览分类，从一处开始探索互联网中真正值得关注的东西；
- **了解**：查看详情、去原平台获取完整内容（引力只做展示与连接，不替代原平台）；
- **分享**：一个链接、一段介绍，把你发现的好东西发布出来，让更多人看见。

### 我们的原则

- **开放**：发现与分享完全开放，内容在哪里发布、交易与交付，仍由原平台负责；
- **中立**：不偏袒任何平台与内容，只做连接；
- **克制**：当前完全免费，未来的增值服务会提前公示。

---

## 设计思想（写给开发者的价值观）

引力是一个**刻意保持简单**的项目。这不是因为它小，而是因为我们认为：**架构是"涨"出来的，不是"设计"出来的。**

### 文件夹是柜子，文件是东西

> 放对柜子即可，规范跟着规模走，不提前设计。

全项目只有四个柜子、三条规则、一个色板：

```
app/          页面柜 —— 一页一个文件，文件名即网址
styles/       样式柜 —— 全部 CSS 统一管理，按访问区分目录（单文件 ≤ 400 行）
components/   组件柜 —— 访问区 + feature 双层，用到两次才抽
lib/          数据柜 —— 数据访问、类型、配置、图标、文本工具
supabase/     迁移柜 —— 数据库唯一真相（001-011，幂等可重跑）
```

三条规则，就这些：

1. **数据只在 `lib/` 里拿** —— 页面不写死数据，读走查询层，写靠 RLS；
2. **重复第二次才抽组件** —— 第一次内联，出现两处再抽象；
3. **颜色只用变量** —— 不写色号，改品牌色只改一处。

### 能力全用托管，只写接线与业务

引力不自己搭后端。认证、数据库、行级安全、对象存储、触发器，全部由 **Supabase BaaS** 承担；代码里只有三样东西：**页面组装、组件交互、业务规则**。这让任何人都能在 10 秒内看懂项目结构，也让维护成本保持在最低。

### 安全是设计出来的，不是写出来的

- **RLS 行级安全**是唯一数据防线：内容公开读、作者写，互动/通知仅本人；
- **列级权限**收口敏感字段：积分（points）对 API 直读直写都被拒绝，本人取值走安全函数；
- **触发器**保证数据一致性：计数、通知、孤儿清理都在数据库层完成，不依赖客户端自觉；
- **service_role 密钥只存在于服务端**：注销账号等管理操作走服务端路由，客户端零密钥。

---

## 技术栈

| 项 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router，Server Component 优先） |
| 语言 | TypeScript 5 strict（禁止 `any` / `@ts-ignore`） |
| 样式 | Tailwind CSS 4 + CSS 变量色板 |
| 数据 | Supabase BaaS：Postgres（RLS）+ Auth（邮箱 / GitHub / Google）+ Storage |
| 包管理 | pnpm 11 |

### 访问区

| 访问区 | 路由 | 说明 |
|---|---|---|
| 落地页 | `/` `/about` `/help` `/terms` `/privacy` | 公开 |
| 认证 | `/login`（登录即注册：邮箱 / 手机号 OTP）`/forgot-password` `/reset-password`（`/register` → 重定向 `/login`） | 邮箱密码（保留验证）+ 手机号 OTP + GitHub / Google + 密码重置 |
| 应用 | `/home` `/discover(/[id])` `/categories(/[slug])` `/square(/[id])` `/profile(/[id])` | 需登录（proxy.ts 守卫） |

---

## 快速开始（本地开发）

### 前置：一个 Supabase 项目

1. 在 [supabase.com](https://supabase.com) 创建项目，记下 Project Settings → API 里的 URL 与两个 key；
2. 项目根目录建 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的项目URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的publishable key
SUPABASE_SERVICE_ROLE_KEY=你的service_role key   # 仅注销账号功能需要，server-only
```

3. 在 Supabase Dashboard 的 SQL Editor **按序执行** `supabase/migrations/001-012`（建表、RLS、触发器、种子数据，幂等可重跑）；
4. 可选：Authentication → Providers 开启 GitHub / Google（回调地址见 `docs/THIRD-PARTY-LOGIN.md`）。

### 运行

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm lint       # ESLint 检查
pnpm build      # 生产构建（如遇 NODE_OPTIONS 干扰：env -u NODE_OPTIONS pnpm build）
```

---

## 文档

| 文档 | 内容 |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | 架构规范：四个柜子、三条规则、数据层纪律 |
| [docs/SYSTEM-ARCHITECTURE.md](docs/SYSTEM-ARCHITECTURE.md) | 一页纸版 + 规模化前置清单（触发条件对照） |
| [docs/ARCHITECTURE-GOVERNANCE.md](docs/ARCHITECTURE-GOVERNANCE.md) | 前端治理与演进进度 |
| [docs/ARCHITECTURE-REVIEW-v4.md](docs/ARCHITECTURE-REVIEW-v4.md) | 架构评审 v4（问题清零基线） |
| [docs/ARCHITECTURE-REVIEW-v5.md](docs/ARCHITECTURE-REVIEW-v5.md) | 架构评审 v5（最新） |
| [docs/THIRD-PARTY-LOGIN.md](docs/THIRD-PARTY-LOGIN.md) | GitHub / Google 登录配置 |
| [docs/AUTH-RECOVERY-DELETE.md](docs/AUTH-RECOVERY-DELETE.md) | 密码重置与账号注销设计 |

---

## 贡献指南（欢迎一起维护）

引力欢迎所有认同它理念的开发者。这里没有复杂的流程，只有几条约定：

### 先认同这三件事

1. **极简优先** —— 在"多做一个功能"和"少引入一个概念"之间，我们永远选后者；
2. **规范跟着规模走** —— 不提前设计，出现重复再抽象，触发条件见规模化前置清单；
3. **数据只在 `lib/`，颜色只用变量** —— 三条规则之外没有别的硬规矩。

### 开发约定（提交前自检）

- [ ] `pnpm lint` 通过，`pnpm build` 通过；
- [ ] 无 `any`、无 `@ts-ignore`、无裸 `href="#"`、无新色号 `#hex`；
- [ ] 新增文件放对柜子：页面 → `app/`，共享组件 → `components/`，数据/类型 → `lib/`，表结构 → `supabase/migrations/`；
- [ ] 数据库改动遵循「RLS 管身份 → 触发器管一致性 → Handler 管业务校验」的归属纪律；
- [ ] 结构有重大调整时，同步更新对应文档（文档即契约）。

### 从哪开始

- 读一遍 [ARCHITECTURE.md](ARCHITECTURE.md)（十分钟）和 [docs/SYSTEM-ARCHITECTURE.md](docs/SYSTEM-ARCHITECTURE.md)（五分钟）；
- 对照 `docs/ARCHITECTURE-REVIEW-v5.md` 的待办清单（规模化前置 S1-S9）认领任务；
- 有想法先聊再写：**先讨论「这个规则该在哪一层」，再动手写代码。**

### 已知边界

- 当前为纯前端 MVP + Supabase BaaS，无自建后端；
- 分页、缓存、测试 CI、CSP 等规模化项按触发条件推进（见规模化前置清单）；
- 微信登录需企业主体资质，暂不在路线图内。

---

*引力 · 让好东西有地方摆，让有需求的人找得到。*
