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
components/   组件柜 —— 用到两次才抽，按「访问区 → feature」双层
lib/          数据柜 —— 数据访问、类型、配置、图标、文本工具集中管理
supabase/     迁移柜 —— 数据库唯一真相（001-029，幂等可重跑；手动复制 SQL 到 Dashboard 执行，不引入 CLI）
```

```
yinli/
├── app/                        页面柜：只做 URL → 页面组装
│   ├── (marketing)/            落地页 / + 法律页 + 公告页 /notice/[slug] + 治理总纲 /governance（均配置驱动）
│   ├── (auth)/                 认证 /login（登录即注册：邮箱；手机号 OTP 代码保留但临时下架，PHONE_AUTH_ENABLED 开关控制，/register → /login）
│   │                           /forgot-password /reset-password
│   ├── (app)/                  应用区：/home（公告走马灯 + 四列内容流 SquareFeed，广场已合并进首页）
│   │                           /discover/[id]（退役重定向 → /square/[id]） /categories(+[slug])
│   │                           /square（永久重定向 → /home）+ /square/[id] /profile(+[id])
│   ├── go/                     外链安全网关（/go?url=…，白/黑名单分级，防开放重定向）
│   ├── auth/callback/          第三方登录 / 密码重置统一回调（code → session）
│   ├── api/account/delete/     自助注销（service_role，server-only）
│   ├── api/auth/devices/       登录设备管理（service_role 查 auth.sessions：GET 列表 / DELETE 撤销，绑定本人）
│   ├── api/reports/feishu/     举报同步飞书多维表格（server：24h 去重 + token 换取 + 建记录，凭证缺失降级 501）
│   ├── api/upload/             图片上传（server：鉴权 + 魔术字节嗅探 + 大小强制 + 限流配额 + upload_audit 审计）
│   ├── error.tsx               根错误边界（含重试）
│   └── layout.tsx              根布局
├── styles/                     样式柜：全部 CSS 统一管理（import 一律 @/styles/...）
│   ├── globals.css             色板 + 全局基础（avatar-img / author-link / logo-mark / error-fallback）
│   ├── marketing/              落地页区：site / sections / legal / notice
│   ├── auth/                   认证区：shell / card
│   └── app/                    应用区：shell / discovery / home / modal / publish-form /
│                               announcement / user-menu / settings / settings-delete / feed /
│                               square / square-detail / detail / detail-comments / profile /
│                               profile-posts / notification / toast / go
├── components/                 组件柜：访问区 + feature 双层
│   ├── common/                 跨区共享：logo
│   ├── marketing/              落地页区：legal-layout
│   └── app/                    应用区（feature 分层）
│       ├── common/             应用区共享（12）：avatar-box / author-link / author-badge / linkified-text /
│       │                       toast（ToastProvider）/ post-menu / load-error / square-card /
│       │                       square-refresh-watcher / rich-editor / rich-content / account-action-modal
│       ├── shell/              应用壳（13）：app-shell / settings-panel / user-menu / publish-modal /
│       │                       notification-drawer / profile-view / profile-tabs / profile-comment /
│       │                       profile-edit-modal / profile-square-post / devices-panel / verify-panel /
│       │                       relation-list
│       ├── discovery/          首页组件：announcement-carousel（discover 已退役，目录名过时待归并）
│       └── square/             广场/内容流（8）：square-feed（四列内容流，与首页统一）/ square-actions /
│                               square-comment-box / square-post-view / square-post-edit-form /
│                               square-profile-post / featured-banner / comment-section
├── lib/                        数据柜：纯 TS，禁止 import 组件
│   ├── queries-posts.ts        查询层·帖子域（DTO 映射 / 列表/详情/作者/sitemap / bumpViews）
│   ├── queries-comments.ts     查询层·评论域（评论读写 + 评论点赞批量态）
│   ├── queries-notifications.ts 查询层·通知域（我的通知 / 已读操作）
│   ├── queries-social.ts       查询层·互动域（帖子点赞 / 关注家族 / 关注粉丝列表）
│   ├── queries-misc.ts         查询层·杂项域（公告 / 域名信誉库 / 认证申请 / re-auth）
│   ├── events.ts               数据变更事件（SQUARE_UPDATED / NOTIFICATION_UPDATED）
│   ├── storage.ts              图片上传 / 删除（removeImage）/ 公开 URL（纯函数，server/client 通用）
│   ├── supabase/               client.ts（浏览器）/ server.ts（cookie 会话）/ admin.ts（service_role，仅 server）
│   ├── types.ts                全局类型 + DTO（SquarePostDTO / CommentDTO / NotificationDTO）
│   ├── data.ts                 静态配置（分类 / 公告正文 NOTICE_ARTICLES / 热词）
│   ├── config.ts               导航 / 发布类型（categories 派生）/ SITE_INFO / OAUTH_PROVIDERS
│   ├── icons.ts                图标单一来源
│   ├── text.ts                 文本工具（URL / #标签提取 / 形态识别 / 相对时间）
│   ├── url-policy.ts           外链入库标准化（sanitizeUrl：协议白名单/拒内网 IP/localhost/非标端口）
│   └── links.ts                外链安全分级（riskOf / safeHref，供 /go 网关）
├── supabase/migrations/        数据库唯一真相（001 users → 002 内容 → 003 互动 → 004 存储 →
│                               005 公开读 → 006 分类对齐 → 007 views RPC → 008 points 收口 →
│                               009 通知清理 → 010 加固 → 011 OAuth 建档 → 012 storage RLS 修复 →
│                               013 views 防刷 → 014 广场分类 → 015 广场发布类型 →
│                               016 discoveries 退役（数据并入 square_posts）→ 017 评论回复/点赞/通知 →
│                               018 设备会话 RPC（security definer 查/撤 auth.sessions）→
│                               019 公告走马灯数据化（announcements 表 + RLS）→
│                               020 安全加固（link_domains 域名信誉库 / url_audit 跳转审计 /
│                               reports 举报 / square_posts.url_status / 发布评论限频）→
│                               021 认证标识（users.badge + verifications 申请表）→
│                               022 上传审计与限流（upload_audit 表，/api/upload 限流配额）→
│                               023 浏览计数 v2（游客 IP 24h 去重，user_id=NULL 不绑定身份，仅帖子维度计数）→
│                               024 展示位（square_posts.featured_until 置顶，UGC 大喇叭，人工置值起步）→
│                               025 推广中心（promo_orders 申请单，/promo 页 + 头像菜单入口，申请制人工开通）→
│                               026 square_posts 查询索引（created_at / category / author，L1 规模化前置）→
│                               027 安全收口（users.badge 列级收写 / promo_orders 加固 / 举报与认证限频 / 内容长度 CHECK）→
│                               028 内容升级（square_posts.content 放宽至 20000，富文本内容能力）；
│                               029 title 列回收（2026-08-29 长文功能清理：drop square_posts.title，列已移除）；
│                               全幂等；手动复制 SQL 到 Supabase Dashboard 执行，不引入 CLI）
├── vitest.config.ts            vitest 配置 + lib/*.test.ts（纯函数冒烟测试）
├── public/                     静态资源
├── docs/                       架构规范 / 评审 / 方案 / 配置文档
└── 配置文件
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
2. **列级权限管敏感字段** —— `points` 与计数列（`likes_count/views/comments_count`）对 API 直读直写被拒，本人取值走 RPC（`get_my_points`）；
3. **触发器管一致性** —— 计数、互动→通知、内容删除→通知清理、OAuth 建档（6+ 函数）；
4. **service_role 管服务端操作** —— 注销等管理操作走 Route Handler（`lib/supabase/admin.ts`，密钥仅 server 环境，严禁客户端 import）。

写路径：发布/评论/点赞/收藏/关注/已读由 client 直接 `insert/update`（RLS 校验）；敏感读取与浏览计数走 RPC；管理操作走 Route Handler——**新增写操作必须先问「这条规则该在哪一层」**。

## 5. 命名与文件规范

| 项 | 规则 | 示例 |
|---|---|---|
| 页面文件 | 固定名 `page.tsx` / `layout.tsx` | `app/(app)/home/page.tsx` |
| 组件文件 | PascalCase，一个文件一个组件；按「访问区 → feature」两层归入 `components/<区>/<feature>/`，跨区共享放 `common/` | `components/app/square/square-actions.tsx` |
| 私有文件 | `_` 前缀（不参与路由） | `(auth)/_components/auth-form.tsx` |
| 类型 | 组件 Props 用 `XxxProps` 命名（简单组件可内联）；展示模型用 `XxxDTO`（queries-*.ts 统一映射，集中在 lib/types.ts） | `SquarePostDTO` / `Announcement`（均在 lib/types.ts） |
| 常量 | UPPER_SNAKE_CASE | `MARKETING_CATEGORIES` |
| 样式文件 | 按访问区归入 `styles/<区>/`，文件名 = 组件/区块维度，单文件 ≤ 400 行 | `styles/app/settings.css` |
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
| 界面布局与前端治理 | ✅ 阶段 0 完成 | 页面、组件、样式、死链清理 |
| Supabase 接入（Auth + Postgres + Storage） | ✅ 已完成 | 见下「已落地里程碑」 |
| 认证基座（1a） | ✅ | Auth + cookie 会话 + proxy.ts 守卫 + public.users 触发器建档 + RLS |
| 用户资料完整化（2a） | ✅ | 设置面板昵称/简介接库；user-menu 读 users 表 |
| 内容上库（2b） | ✅ | 3 内容表 + seed + 查询层 + 发布/评论写库；双内容池退役 |
| 互动与通知（2c） | ✅ | likes/favorites/follows/notifications + 触发器；通知抽屉接库；他人主页 |
| 图片存储（S） | ✅ | avatars/covers/posts 公开桶 + 上传/展示/删除 + 全站头像 |
| 批次 A（P1 修复） | ✅ | hasUrl 正则状态 / 列表加载兜底 + 重试 / 写操作错误回滚 |
| 批次 B（一致性） | ✅ | 分类归一（categories 派生）/ views 计数 RPC / storage 纯函数化 + 孤儿清理 / next 白名单 + points 收口 |
| 批次 C（加固 + 合规） | ✅ | 通知清理触发器 / 列级 revoke + 自关注约束 / 假数据清理 / 备案占位统一 / 安全头 4 项 / 根错误边界 |
| 第三方登录 | ✅ | GitHub + Google（OAuth PKCE，`OAUTH_PROVIDERS` 驱动，`/auth/callback` 统一回调） |
| 认证闭环 | ✅ | 忘记密码（recovery session + `/reset-password`）/ 自助注销（service_role + storage 即时清理）/ 登录设备管理（auth.sessions 列表 + 撤销，双栏设置「登录设备」项） |
| 架构评审 v4 / v5 / v6 | ✅ | 问题清零基线（v4）→ 9.0/10（v5，2026-08-22）→ 8.4/10（v6，2026-08-23） |
| 广场分类 / 发布类型（014/015） | ✅ | 内容分类（SQUARE_CATEGORIES）+ 发布类型三入口（share/opportunity/content）；手动复制 SQL 已入库 |
| 外链安全网关 `/go` | ✅ | 白/黑名单分级（lib/links.ts），白名单服务端直跳，未知需确认，高危拦截 |
| 首页四列内容流（方案A） | ✅ | 广场合并进首页（/square 永久重定向 /home）；统一内容流 SquareFeed（四列 .home-grid + SquareCard），承接分类 + ?q= 搜索 + 024 全服通告；右栏 AppAside 下线，广告并入顶部公告轮播；零迁移零新依赖（2026-08-27） |
| 内容池归一（016） | ✅ | discoveries 退役并入 square_posts：发布统一广场、分类页/个人主页改读 square、`/discover/[id]` 重定向到 `/square/[id]` |
| vitest 冒烟 | ✅ | 纯函数测试（lib/text.test.ts / lib/links.test.ts / lib/url-policy.test.ts 等）落地 |
| 安全收口（027） | ✅ | users.badge 列级收写 / promo_orders 加固（状态/定价/归属）/ 举报与认证限频 / 内容长度 CHECK（2026-08-29） |
| 富文本内容（028） | ✅ | content 放宽至 20000 + TipTap 编辑器（B/斜体/列表/链接 4 按钮）+ DOMPurify 双防线 + 富文本链接走 /go 网关（2026-08-29） |
| 规模化前置（CSP / 分页缓存 / 迁移 CLI 等） | 🔜 待办 | 触发条件与方案见 `docs/SYSTEM-ARCHITECTURE.md` §七；迁移 CLI 经用户决策改用手动复制 |

**防膨胀红线**：新增第 3 套分类体系或第 3 种图标方案前，必须先归一；**图标边界（2026-08-28 P2-3 收口）**：组件 UI 层图标一律 `lucide-react`，配置/数据层（可序列化静态配置，如 config.ts 导航/分类枚举）用 `lib/icons.ts` 字符串表，禁止混层；`lib/queries-*.ts` 任一超过 500 行或新增领域时按需拆分（平层文件取向，不留 re-export 桶，调用方直接改 import）；新增写操作必须先定「RLS / 列级权限 / 触发器 / Handler」归属。

---

*本规范 v3.5 于 2026-08-29 修订（029 title 列回收：`square_posts.title` drop，前端 6 处残留 + 测试 + 3 组样式全部清理；详情页 SEO 回落「作者 的话题」）。v3.4 于 2026-08-29 修订（S3 拆分：`lib/queries.ts` → `queries-{posts,comments,notifications,social,misc}.ts` + `events.ts`，平层文件不留 re-export 桶，全部引用方改 import；数据边界/三条规则/lib 目录树/命名规范/防膨胀红线同步）。v3.3 于 2026-08-29 修订（迁移 001-028 补登 027 安全收口 / 028 内容升级 + 029 title 列遗留说明；组件树对齐实际目录；§8 演进表补 027/028；README/一页纸版/手册同步四列内容流与组件归属）。v3.2 于 2026-08-27 修订（迁移 001-025：新增 025 推广中心 promo_orders 申请单 + /promo 独立页 + 头像菜单入口，商业化阶段 1 申请制；商业化蓝图见 docs/DEVELOPER-HANDBOOK.md §2.6 及 /promo 页）。v3.1 于 2026-08-27 修订（迁移 001-024：新增 024 展示位 featured_until 置顶字段 + 侧栏广告位复用 announcements kind=ad；展示位/广告位商业化架构落地）。v3.0 于 2026-08-27 修订（迁移 001-023：新增 023 浏览计数 v2（游客 IP 24h 去重、user_id=NULL 不绑定身份）；发布三入口合并为单一表单 + 可选标注；登录页新用户注册引导；正文/评论换行 pre-line 修复；ARCHITECTURE.md 迁移声明同步 001-023）。v2.9 于 2026-08-24 修订（迁移 001-022 全部执行并补登标记；新增 022 上传审计与限流、api/upload 路由、lib/url-policy.ts；/discover/[id] 标注退役重定向；手机号 OTP 临时下架（PHONE_AUTH_ENABLED 开关）；安全边界修复落地（外链网关兜底/上传限流/公告图片，见 DEVELOPER-HANDBOOK §2.5）；文档一致性对齐）。v2.8 于 2026-08-23 修订（回填：/go 外链网关、home-feed 首页三列卡片、toast/post-menu/lib-links、迁移清单 001-015（补 014 广场分类 / 015 广场发布类型）、CSS 拆分（square-detail / profile-posts / publish-form / home）、vitest 冒烟；明确迁移 = 手动复制 SQL 执行、不引入 CLI）。v2.7 于 2026-08-22 修订（目录树同步认证闭环与批次 A/B/C：新增 auth/callback、api/account/delete、reset-password、error/loading、admin.ts、load-error、settings-delete；迁移清单 001-011；§4 升级为数据安全四层；§8 演进表补齐批次与 OAuth；README 与一页纸版同步）。v2.6 于 2026-08-21 修订（目录树同步 2a-2c 与图片存储全部演进，数据边界从 mock 改为 Supabase BaaS）。争议裁决原则：简单优先。*
