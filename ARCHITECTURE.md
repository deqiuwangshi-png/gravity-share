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
supabase/     迁移柜 —— 数据库唯一真相（001-042，幂等可重跑；手动复制 SQL 到 Dashboard 执行，不引入 CLI）
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
│   ├── queries-posts.ts        查询层·帖子域（DTO 映射 / 列表/详情/作者/sitemap）
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
│                               040 views 清理（2026-09-01 MVP 阶段不运营浏览指标：drop bump_views RPC /
│                               view_events 明细表 / square_posts.views 与 discoveries.views 列）；
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
2. **列级权限管敏感字段** —— `points` 与计数列（`likes_count/comments_count`）对 API 直读直写被拒，本人取值走 RPC（`get_my_points`）；
3. **触发器管一致性** —— 计数、互动→通知、内容删除→通知清理、OAuth 建档（6+ 函数）；
4. **service_role 管服务端操作** —— 注销等管理操作走 Route Handler（`lib/supabase/admin.ts`，密钥仅 server 环境，严禁客户端 import）。

写路径：发布/评论/点赞/收藏/关注/已读由 client 直接 `insert/update`（RLS 校验）；敏感读取走 RPC；管理操作走 Route Handler——**新增写操作必须先问「这条规则该在哪一层」**。

## 5. 命名与文件规范

| 项 | 规则 | 示例 |
|---|---|---|
| 页面文件 | 固定名 `page.tsx` / `layout.tsx` | `app/(app)/home/page.tsx` |
| 组件文件 | PascalCase，一个文件一个组件；按「访问区 → feature」两层归入 `components/<区>/<feature>/`，跨区共享放 `common/` | `components/app/square/square-actions.tsx` |
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
| 广场分类 / 发布类型（014/015） | ✅ | 内容分类（SQUARE_CATEGORIES）+ 发布类型三入口（share/opportunity/content）；手动复制 SQL 已入库（发布端 2026-08-27 已合并为单一表单，新帖统一 share，库枚举保留，见下方 2026-08-31 条目） |
| 外链安全网关 `/go` | ✅ | 白/黑名单分级（lib/links.ts），白名单服务端直跳，未知需确认，高危拦截 |
| 首页四列内容流（方案A） | ✅ | 广场合并进首页（/square 永久重定向 /home）；统一内容流 SquareFeed（四列 .home-grid + SquareCard），承接分类 + ?q= 搜索 + 024 全服通告；右栏 AppAside 下线，广告并入顶部公告轮播；零迁移零新依赖（2026-08-27） |
| 内容池归一（016） | ✅ | discoveries 退役并入 square_posts：发布统一广场、分类页/个人主页改读 square、`/discover/[id]` 重定向到 `/square/[id]` |
| vitest 冒烟 | ✅ | 纯函数测试（lib/text.test.ts / lib/links.test.ts / lib/url-policy.test.ts 等）落地 |
| 安全收口（027） | ✅ | users.badge 列级收写 / promo_orders 加固（状态/定价/归属）/ 举报与认证限频 / 内容长度 CHECK（2026-08-29） |
| 富文本内容（028） | ✅ | content 放宽至 20000 + TipTap 编辑器（B/斜体/列表/链接/图片 + 图集条，第1张作封面）+ sanitize-html 双防线 + 富文本链接走 /go 网关（2026-08-29；2026-09-02 由 DOMPurify → isomorphic-dompurify → sanitize-html 迁移：Vercel Serverless 无法运行时加载 jsdom，sanitize-html 为纯 JS 解析器，Node/浏览器双端同语义净化） |
| 发布表单精简（2026-09-02） | ✅ | 标题由可选改前端必填（发布+编辑同步，placeholder「请输入标题」，库列仍可空兼容存量）；正文占位删「（可加 #标签）」（标签系系统自动提取）；compact 工具栏移除「链接」按钮——正文输入/粘贴 URL 自动成链（Link autolink+linkOnPaste），编辑端全量模式按钮保留；compact 列表固定无序（文案明示，减少决策成本） |
| 发布交互保护（2026-09-02） | ✅ | 编辑器持续交互态保护：dirty（标题/正文/图集任一非空）时关闭须二次确认（放弃并关闭 / 继续编辑，内联覆盖保留现场）；遮罩关闭由 onClick 冒泡改 onMouseDown + 目标自检（堵「编辑区内按下 → 遮罩上松手」的跨边界 click 误关）；X / Esc / 点遮罩统一走 attemptClose 守卫；提交中禁关（防提交竞态）。零新依赖，样式入 publish-form.css（.publish-box 定位参照，不影响共享 modal.css） |
| 富文本列表 marker（2026-09-02） | ✅ | 修复无序/有序列表不渲染小黑点：Tailwind v4 preflight 全局 `list-style:none`，rich.css 编辑区（.rich-editor-content）与渲染端（.rich-content）补显式 list-style-type（disc/decimal），作用域限定富文本容器不误伤全局菜单 ul |
| CSS 拆分 rich.css（2026-09-02） | ✅ | rich.css 达 410 行超 400 红线 → 按组件语义拆为 rich-editor.css（编辑器容器/工具栏/编辑区排版/compact/图集条，318 行）+ rich-content.css（渲染端排版，94 行）；`(app)/layout.tsx` import 同步替换，旧文件删除 |
| 样式工程规则落档（2026-09-02） | ✅ | 用户确认「CSS/Tailwind 样式工程规则」落档 AGENTS.md：样式优先级 = Design Token → 公共组件（项目内已有，不建通用库）→ Tailwind 原子类 → 组件级 CSS（限第三方覆盖/编辑器 DOM/动画/伪元素/复杂选择器等）→ 全局 CSS；AI 新建 CSS 文件前必答 5 问；存量 34 个 CSS 文件维持不迁（用户决策），仅约束新代码；DEVELOPER-HANDBOOK §1.2/§3.4 同步口径。⚠ 同日经 CSS 审计（deliverables/css-architecture-audit-2026-09-02.md）**改为分批迁移**（P0-P4），原「维持不迁」作废——见本表下方「CSS 迁移 P0 试点 / P3 认证区 / P2-home+P3-壳」条目 |
| 样式语料打通 Tailwind（2026-09-02） | ✅ | `globals.css` 完成全量 `@theme inline` 映射（25 项：颜色 21 + 圆角 3 + 阴影 2，探针实证编译生成且值链回 :root 变量），Tailwind 从「仅 preflight」升级为可写业务类（bg-primary/text-muted/rounded-card/shadow-card/border-line…）；命名翻译避免怪类（--text-muted→text-muted、--bg-hover→bg-hover、--border→border-line）；字号保留 13/15px 习惯用任意值兜底；细则落 docs/STYLE-SYSTEM.md（三轨模型/映射表/决策树/CSS 保留清单/新增 CSS 准入） |
| CSS 迁移 P0 试点：落地页 Tailwind 化（2026-09-02） | ✅ | marketing 落地页 site.css(347)+sections.css(368) 共 715 行纯布局类迁 Tailwind 原子类：拆 3 区块组件（landing-header 吸顶导航 / landing-hero 搜索区 / landing-footer 页脚）+ page.tsx 主体 8 区块就地类化（section-head 标题组抽本地 SectionHead，单页复用不跨文件不建库）；globals.css 新增 `@utility container`（限宽 1180 居中，≤800px 收 15px 边距嵌套档逐字保留）；响应式断点精确保留 800/520（max-[800px]:/max-[520px]: 变体）；`.logo` 三处（header/footer/legal-layout）统一 Tailwind 类；两 CSS 文件删除、(marketing)/layout.tsx import 清理（34→32 文件）；零视觉变化（同值映射 + 逐像素断点）。Q4 Token 补齐先行落地见 STYLE-SYSTEM.md §2.1 |
| CSS 迁移 P3：认证区 Tailwind 化（2026-09-02） | ✅ | (auth) 区 shell.css(210)+card.css(318) 纯布局/外观迁 Tailwind 原子类：layout 双栏壳就地类化（品牌面板绿底白字 + 表单面板 bg-background，断点 820/480 逐像素保留）；三表单（auth-form/forgot-form/reset-form）标题/模式切换/表单体/社交行全部原子类化。抽 (auth)/_components 本地共享控件：auth-submit.tsx（AuthSubmit + authButtonClass 供 Link 复用「返回登录」等按钮式链接）+ auth-field.tsx（AuthField 标签壳 / AuthInput），auth 区本地复用不建通用 Button 库（守 AGENTS.md 纪律）。颜色语义纠正：原 `.auth-submit{color:var(--surface)}` 语义偏差（值同 #fff）→ `text-on-primary`，零视觉变化。复用锚点不动：globals `.password-field`/`.logo-mark`（auth + app 共用）。纯装饰/动画瘦身保留为 styles/auth/decor.css 单文件（145 行：品牌面板 ::before/::after 双圆、logo-mark 白 16% 徽章覆盖、orbit 轨道全家、@keyframes auth-modal-in、modal 遮罩/壳/图标 + 非令牌 rgba 遮罩/阴影）；两 CSS 文件删除、(auth)/layout.tsx import 改 decor.css（32→31 文件）。颜色映射表先建后迁（无缺口），按「UI 迁移颜色保护规则」执行，待视觉冒烟 |
| CSS 迁移 P2-home+P3-壳：应用整屏 Tailwind 化（2026-09-02） | ✅ | (app) 区「壳 + 内容流整屏」迁移（用户两次拍板：范围=壳+内容流 / 非令牌 rgba 归 decor 保留 / .app-content 收 @utility）。`shell.css`(255)+`home.css`(153) 迁 Tailwind 后删除，import 改新收容文件 `styles/app/decor.css`；app-shell.tsx 侧栏/导航/顶栏/搜索/发布按钮全量原子类（断点 800/480 逐像素），**壳变量宿主坑已规避**（`--app-sidebar-w/--app-topbar-h` 随 .app-shell 入 decor.css，notification 抽屉 left/top 定位依赖、≤800 归零）；卡片流 square-card/featured-banner/square-feed 原子类化 + 抽 `homeGridClass` 公共导出（4 页复用）；9 处 feed-head 页头统一原子类（home/loading/load-error/categories/boost×2/promo×2/followers/following）；globals 新增 `@utility app-content`（13 页根零改动，与 P0 `container` 同款）；square.css/feed.css 缩水（只留详情页三件套与分类页 category-*，头部注明去向）；全库复扫零悬挂类名；31→30 文件（decor.css +1 / shell+home -2）。零新依赖；待用户本地 pnpm check + build + 视觉冒烟 |
| CSS 迁移 P2-详情页：广场详情页 Tailwind 化（2026-09-02） | ✅ | (app) 区 /square/[id] 详情页整页迁移（用户拍板：整页一次做掉，不拆两批）。square-detail.css(229)+square-comments.css(246)+square.css 剩余三件套(82) 共 557 行全令牌（零 rgba/伪元素/keyframes → 无需 decor 收容）迁 Tailwind 后三文件删除、layout import 清理（25→22）；涉及 [id]/page.tsx（悬挂类 square-detail-wrap 摘除——CSS 无定义零影响 + 容器/返回/H1/related 类化）与 square-post-view/square-actions/square-post-edit-form/comment-section/square-comment-box 五组件原子类化；`.linkified` 随 linkified-text 组件内化（详情纯文本正文 + RichContent 兜底两处同变，首页卡片不消费）；square.css 三件套 AvatarBox 30px 头像透传（grid size-[30px] 圆底）；PostMenu 推右端改容器任意变体 `[&>.comment-menu]:ml-auto`（不动 post-menu/comment-menu.css 公共件）；公共子件 rich-content/rich-editor/gallery/comment-menu/ad/publish-form 样式保留原文件；30→27 文件。零新依赖；外溢面：SquarePostEditForm 被个人主页 profile-square-post 共用（同值无视觉差，验收须冒烟个人主页编辑态）；待用户本地 pnpm check + build + 视觉冒烟 |
| CSS 迁移 P-profile 区：个人主页 Tailwind 化（2026-09-02） | ✅ | (app) 区 /profile 个人主页区整批迁移（用户拍板：整批一次做掉）。profile.css(335)+profile-posts.css(153)+relation.css(72) 共 560 行全令牌（非令牌 rgba 仅编辑弹窗面板阴影 1 处）迁 Tailwind 后三文件删除、layout import 清理（22→19）；涉及 profile-view（封面 4:1 bg-cover 占位 + 换封面按钮 `opacity-0 group-hover/group-focus-within:opacity-100` + `[@media(hover:none)]:opacity-100!` 触屏恒显、头像 88px `-mt-11` 骑跨、统计链接 `hover:[&_b]:text-primary`、编辑/关注按钮两态三元）/profile-tabs（胶囊 active 绿色下划线）/profile-square-post（X 风格帖卡 + 编辑态 div）/profile-comment/profile-edit-modal（框架原子化，内部 settings-* 行控件保留 settings.css）/relation-list（列表卡 + 关注按钮与 profile-view 同款）6 组件 + following/followers 页；3 悬挂类摘除（relation-page / editing / profile-post 编辑态标记——CSS 均无定义零影响）；decor.css 追加 ⑤ 收容 2 条（`.profile-edit-overlay` grid 遮罩壳——unlayered 覆盖 modal.css app-modal 的 flex+15px、`.profile-edit-modal` 面板阴影 rgba 非令牌，宿主类名 JSX 保留）；`.profile-follow-btn` 跨组件牵连（profile-view + relation-list 两处同步原子化同款）；27→24 文件。零新依赖；待用户本地 pnpm check + build + 视觉冒烟 |
| CSS 迁移 P-设置与合规族：设置面板族 + 合规帮助反馈 Tailwind 化（2026-09-02） | ✅ | (app) 设置面板族 + (marketing) 合规帮助反馈族整批迁移（用户拍板：同批一次做掉 + legal.css 瘦身保留）。app 设置族 settings.css(295)+settings-devices.css(123)+account-action.css(124)+verify.css(196) 与 marketing notice.css(29) 五文件迁 Tailwind 后删除、双 layout import 清理（24→19，app 区清 4 import、marketing 清 notice.css）；verify.css 混合文件拆分：徽标基础段（badge-official/badge-discoverer/avatar-official 相框）内化 author-badge/avatar-box（全站 7 组件消费一处同变，verify-gold 渐变任意值），verify-* 面板段归 verify-panel；settings-panel（5 tab 壳/行控件抽常量，640 断点仅 grid-cols-1 保真）+ devices-panel + verify-panel + account-action-modal 四组件原子类化，回收 P-profile 遗留 settings-* 行控件债务（profile-edit-modal 同款原子化）；legal-layout 壳 + notice/[slug] 页自写段原子类化（notice-block/notice-subtitle 2 悬挂类摘除，8 legal 页内容零改动），legal.css 瘦身只留 .legal-section/.legal-link/.legal-table 排版层（marketing 区剩 1 文件）；decor.css 追加 ⑥ 收容 5 条非令牌/伪元素规则（settings-overlay 浅遮罩 / nav active::before 绿竖条含 640 隐藏 / account-action-overlay z110 / 面板阴影 / input focus 光晕）并移 decor.css 至 (app)/layout import 末位——修复同特异性 modal.css 后加载覆盖 decor ⑤⑥ 的层叠隐患（P-profile ⑤ grid 居中与 settings 浅遮罩此前未实际生效，本批一并生效）；行控件 [font:inherit] 两处补齐保真（bio/昵称 input）。零新依赖；待用户本地 pnpm check + build + 视觉冒烟 |
| CSS 迁移 P-分类与发布：分类页族 + 发布表单 Tailwind 化（2026-09-02） | ✅ | (app) 区分类页族 + 发布表单族整批迁移（用户拍板：同批一次做掉 + modal 壳瘦身保留 + #fff 白字 decor 收容）。feed.css(149 全 category-* 段)+publish-form.css(233) 迁 Tailwind 后删除、layout import 清理（19→17）；分类侧 5 页面原子类化：/categories 3 列大卡片（grid-cols-3 + `max-[900px]:grid-cols-2`/`max-[480px]:grid-cols-1` 断点逐字保留、card 加 `group` 供 arrow `group-hover:text-primary`、icon/desc/count 令牌化）+ /categories/[slug] 与 /tag/[tag] 详情头家族（back/detail-head/icon/meta/count/empty）+ following/followers 返回链接 4 处同款；发布侧 2 组件：publish-modal（modal-box/modal-header 壳迁入——宽度/内边距/圆角原子化、覆盖层圆角 `rounded-card` 令牌同源替代 inherit、面板阴影 rgba 收 decor；标题下划线输入/沉浸式表单 `grid-cols-[minmax(0,1fr)]` 锁轨/46px 提交钮 disabled 态/分类 chips active 态/放弃确认覆盖层 `absolute inset-0`）与 square-post-edit-form 标题+分类 chips 同款同步；死规则删除（`.publish-immersive textarea` / `.publish-field input/textarea/select`——正文 2026-08-29 富文本化后无原生控件，DoD②）+ publish-type-field 悬挂类摘除；modal.css 瘦身 `.app-modal` 单规则骨架（.modal-box/.modal-header 规则删除）；decor.css 追加 ⑦ 收容 2 条（modal-box 面板阴影 0 30px 80px rgba / close-confirm-discard:hover 实心红底 #fff 白字——#fff 未入令牌按收容规则保留原值，宿主类名 JSX 保留）。零新依赖；待用户本地 pnpm check + build + 视觉冒烟 |
| 图片模型统一（P1，2026-08-31） | ✅ | 发布/编辑/详情三端图片模型统一：编辑页预载存量图进图集条（可管理/删）；删除存量图延迟到保存才清 storage（避免取消编辑 → content 回滚仍引用已删文件 → 404）；取消仅清新上传孤儿；详情页封面用精确 URL 匹配替代 `<img` 字符串判断，与 feed 对齐 |
| 帖子图集化（037，2026-08-31） | ✅ | 图片从正文 HTML 剥离为结构化 `gallery jsonb`（有序 path 数组，第 1 张 = 封面 image_url，≤9 张 CHECK）；发布/编辑写 gallery，保存时 stripImages 剥离正文 img（旧帖保存一次即升级新模型）；图集条左移/右移排序（顺序 = 展示顺序 + 封面）；详情/个人主页渲染 1/2/3 列网格（3 列封顶多行）+ 零依赖 lightbox 点击放大（ESC/左右键/遮罩关闭）；删帖联动清理图集全部文件；旧帖（gallery 空）回退正文内联图 + 封面 |
| 发布标注移除 + 定价区下线（2026-08-31） | ✅ | 发布页删除「包含推广/我的原创」两个可选标注（新帖统一 post_type=share，存量机会/来源标识保留渲染，库 015 不动）；落地页定价三卡整体下线，改为免费口径文案（「目前完全免费，未来付费会提前公告」），pricing.css 与 PRICING_TIERS 一并删除 |
| 规模化前置（CSP / 分页缓存 / 迁移 CLI 等） | 🔜 待办 | 触发条件与方案见 `docs/SYSTEM-ARCHITECTURE.md` §七；迁移 CLI 经用户决策改用手动复制 |

**防膨胀红线**：新增第 3 套分类体系或第 3 种图标方案前，必须先归一；**图标边界（2026-08-28 P2-3 收口）**：组件 UI 层图标一律 `lucide-react`，配置/数据层（可序列化静态配置，如 config.ts 导航/分类枚举）用 `lib/icons.ts` 字符串表，禁止混层；`lib/queries-*.ts` 任一超过 500 行或新增领域时按需拆分（平层文件取向，不留 re-export 桶，调用方直接改 import）；新增写操作必须先定「RLS / 列级权限 / 触发器 / Handler」归属。

---

*本规范 v3.5 于 2026-08-29 修订（029 title 列回收：`square_posts.title` drop，前端 6 处残留 + 测试 + 3 组样式全部清理；详情页 SEO 回落「作者 的话题」）。v3.4 于 2026-08-29 修订（S3 拆分：`lib/queries.ts` → `queries-{posts,comments,notifications,social,misc}.ts` + `events.ts`，平层文件不留 re-export 桶，全部引用方改 import；数据边界/三条规则/lib 目录树/命名规范/防膨胀红线同步）。v3.3 于 2026-08-29 修订（迁移 001-028 补登 027 安全收口 / 028 内容升级 + 029 title 列遗留说明；组件树对齐实际目录；§8 演进表补 027/028；README/一页纸版/手册同步四列内容流与组件归属）。v3.2 于 2026-08-27 修订（迁移 001-025：新增 025 推广中心 promo_orders 申请单 + /promo 独立页 + 头像菜单入口，商业化阶段 1 申请制；商业化蓝图见 docs/DEVELOPER-HANDBOOK.md §2.6 及 /promo 页）。v3.1 于 2026-08-27 修订（迁移 001-024：新增 024 展示位 featured_until 置顶字段 + 侧栏广告位复用 announcements kind=ad；展示位/广告位商业化架构落地）。v3.0 于 2026-08-27 修订（迁移 001-023：新增 023 浏览计数 v2（游客 IP 24h 去重、user_id=NULL 不绑定身份）；发布三入口合并为单一表单 + 可选标注；登录页新用户注册引导；正文/评论换行 pre-line 修复；ARCHITECTURE.md 迁移声明同步 001-023）。v2.9 于 2026-08-24 修订（迁移 001-022 全部执行并补登标记；新增 022 上传审计与限流、api/upload 路由、lib/url-policy.ts；/discover/[id] 标注退役重定向；手机号 OTP 临时下架（PHONE_AUTH_ENABLED 开关）；安全边界修复落地（外链网关兜底/上传限流/公告图片，见 DEVELOPER-HANDBOOK §2.5）；文档一致性对齐）。v2.8 于 2026-08-23 修订（回填：/go 外链网关、home-feed 首页三列卡片、toast/post-menu/lib-links、迁移清单 001-015（补 014 广场分类 / 015 广场发布类型）、CSS 拆分（square-detail / profile-posts / publish-form / home）、vitest 冒烟；明确迁移 = 手动复制 SQL 执行、不引入 CLI）。v2.7 于 2026-08-22 修订（目录树同步认证闭环与批次 A/B/C：新增 auth/callback、api/account/delete、reset-password、error/loading、admin.ts、load-error、settings-delete；迁移清单 001-011；§4 升级为数据安全四层；§8 演进表补齐批次与 OAuth；README 与一页纸版同步）。v2.6 于 2026-08-21 修订（目录树同步 2a-2c 与图片存储全部演进，数据边界从 mock 改为 Supabase BaaS）。争议裁决原则：简单优先。*
