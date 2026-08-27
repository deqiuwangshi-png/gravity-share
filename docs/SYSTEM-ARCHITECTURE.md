# 引力（yinli）架构规范 · 一页纸版

> 前期项目 = 极简架构：**四个柜子、三条规则、一个色板 + Supabase 数据层**。
> 目标是让任何接手的人（包括非技术的合作方）10 秒看懂。完整技术细节见根目录 `ARCHITECTURE.md`。

---

## 一、几个柜子（目录就这几层）

```
app/          页面柜 —— 一页一个文件，文件名就是网址
styles/       样式柜 —— 全部 CSS 统一管理，按访问区分目录
components/   组件柜 —— 用到两次才抽，按「访问区 → feature」双层
lib/          数据柜 —— 查询层、类型、配置、图标、Supabase 客户端
supabase/     迁移柜 —— 数据库唯一真相（001-025，幂等可重跑；手动复制 SQL 到 Dashboard 执行，不引入 CLI）
```

```
app/
├── (marketing)/  落地页 / + 法律页
├── (auth)/       登录 / 注册 / 忘记密码 / 重置密码
├── (app)/        home（公告 + 三列卡片流）/ discover(+[id] 退役重定向 → /square/[id]) / categories(+[slug]) /
│                 square(+[id]) / profile(+[id] 他人主页)
├── go/           外链安全网关（/go?url=…，白/黑名单分级）
├── auth/callback/  第三方登录 / 密码重置统一回调
├── api/account/delete/  自助注销（service_role，server-only）
├── api/auth/devices/    登录设备管理（service_role 查/撤 auth.sessions，绑定本人）
├── api/reports/feishu/  举报同步飞书多维表格（24h 去重 + 凭证缺失降级 501）
└── api/upload/          图片上传（鉴权 + 魔术字节嗅探 + 限流配额 + upload_audit 审计）
styles/
├── globals.css   色板 + 全局基础
├── marketing/ · auth/ · app/（单文件 ≤400 行；含 square-detail / profile-posts / publish-form / home 等拆分文件）
components/
├── common/       logo / linkified-text / author-link / avatar-box / load-error / toast / post-menu
├── marketing/    legal-layout
└── app/          shell/（9）· discovery/（2：announcement-carousel / profile-post）· square/（6：square-feed 四列内容流等）
lib/
├── queries.ts    查询层：读 + 互动/通知操作 + bumpViews（DTO 映射，注入双端 client）
├── storage.ts    图片上传 / 删除 / 公开 URL（纯函数，双端通用）
├── supabase/     client.ts（浏览器）/ server.ts（cookie 会话）/ admin.ts（service_role，仅 server）
├── data.ts       静态配置（分类 / 公告正文 / 热词）
└── types / config（含 OAUTH_PROVIDERS / SITE_INFO / SQUARE_CATEGORIES）/ icons / text / url-policy（sanitizeUrl 入库标准化）/ links（外链分级）
supabase/migrations/   001-025（users → 内容 → 互动 → 存储 → 公开读 → 分类 → views →
                       points 收口 → 通知清理 → 加固 → OAuth 建档 → storage RLS 修复 →
                       views 防刷 → 广场分类 → 广场发布类型 → discoveries 退役并入 square_posts →
                       评论回复/点赞/通知 → 设备会话 RPC → 公告走马灯数据化 → 安全加固
                       （域名信誉库/跳转审计/举报/外链处置/限频）→ 认证标识（badge + 申请表）→
                       上传审计与限流（upload_audit）→ 浏览计数 v2（游客 IP 24h 去重，
                       user_id=NULL 不绑定身份）→ 展示位（featured_until 置顶，UGC 大喇叭）→
                       推广中心（promo_orders 申请单，申请制人工开通），全幂等；手动复制 SQL 执行）
```

> 数据：**全部在 Supabase**（业务表 / 存储桶 / RLS / 列级权限 / 触发器见迁移 001-025；计数列只读由触发器维护）。页面不写死数据，读走 `lib/queries.ts`，写靠 RLS + 触发器保护，管理操作走 service_role 服务端路由。

## 二、三条规则（就这些，多了没人遵守）

1. **数据只在 `lib/` 里拿** —— 页面不写死数据；内容/评论/互动/通知全走查询层
2. **重复第二次才抽组件** —— 第一次直接写页面里，用到两处了再抽
3. **颜色只用变量** —— 不写色号，改品牌色只改 `styles/globals.css` 一处

## 三、页面范围与访问控制（真实守卫已生效）

| 访问区 | 路由 | 访问控制 |
|---|---|---|
| 官网落地页 | `/` 及法律页 | 公开 |
| 认证 | `/login` `/register` `/forgot-password` `/reset-password` | 已登录自动跳 `/home` |
| 应用主页 | `/home` `/discover/[id]`（退役重定向 → `/square/[id]`）`/categories*` `/square*` `/profile*` | **需登录**（proxy.ts 守卫，未登录 → `/login?next=...`） |

登录：邮箱密码（邮箱验证）+ GitHub / Google（OAuth PKCE，统一 `/auth/callback` 回调）+ 忘记密码（recovery session → `/reset-password`）+ 自助注销（`/api/account/delete`）；会话：cookie（@supabase/ssr）。

## 四、已实现模块清单

| 模块（路由） | 说明 |
|---|---|
| 首页 `/home` | 公告走马灯（含广告海报卡）+ 四列内容流 SquareFeed（与广场合并，2026-08-27）；承接分类筛选 / ?q= 搜索 / 024 全服通告；原推荐位下线 |
| 发现详情 `/discover/[id]` | 已退役（2026-08-23 内容池归一）：重定向到 `/square/[id]`，旧链接不 404 |
| 分类 `/categories` | 入口页动态计数 + 分类详情 `/categories/[slug]` |
| 广场 `/square` | 永久重定向到 `/home`（2026-08-27 方案A 合并）；详情 `/square/[id]`（点赞/评论/配图）保留 |
| 个人 `/profile` | 我的主页（资料/发布/评论）+ 他人主页 `/profile/[id]`（关注按钮/粉丝数） |
| 发布 | 弹窗三入口：分享 / 机会 / 内容（分类必选，可配图），写库后列表实时刷新 |
| 通知 | 顶栏铃铛 + 预览抽屉：互动（赞/评/关）自动触发，点条目已读跳转 |
| 头像/封面 | 设置面板传头像、个人主页换封面、广场发帖配图（公开桶；换图自动清旧图） |
| 认证闭环 | 邮箱 + GitHub/Google 登录、密码重置（/reset-password）、自助注销（含 storage 即时清理） |
| 安全加固 | 列级权限（points/计数列只读）、浏览计数 RPC、通知清理触发器、安全头 4 项 |
| 外链安全网关 | `/go?url=…` 白/黑名单分级（lib/links.ts），白名单服务端直跳防开放重定向，未知需确认，高危拦截 |

## 五、色板（全站就这 15 个颜色变量，定义在 `styles/globals.css`）

| 分类 | 变量 | 色值 | 用途 |
|---|---|---|---|
| 主色 | `--primary` | `#006855` | 主按钮、链接、选中态 |
| | `--primary-dark` | `#005346` | hover / 按压 |
| | `--primary-soft` | `#e9f3ef` | 标签底、选中底 |
| | `--primary-subtle` | `#f0f6f3` | 页面浅底 |
| | `--on-primary` | `#ffffff` | 主色上的文字 |
| 辅助 | `--accent` | `#f3c969` | 金色点缀 |
| | `--accent-soft` | `#faf4df` | 商业标签底 |
| | `--on-accent` | `#8b6b20` | 商业标签文字 |
| 背景 | `--background` | `#f7f8f6` | 页面底色 |
| | `--surface` | `#ffffff` | 卡片 / 面板 |
| | `--bg-raised` | `#fbfcfb` | 侧边栏 / 浮层 |
| | `--bg-hover` | `#f0f3f1` | hover 背景 |
| 文字 | `--foreground` | `#111816` | 主文字 |
| | `--text-muted` | `#68736f` | 次级说明 |
| | `--text-soft` | `#8a938f` | 弱提示 / 占位 |
| | `--text-disabled` | `#b4bcb8` | 禁用 |
| 边框 | `--border` | `#e4e8e5` | 常规边框 |
| | `--border-primary` | `#a9d0c5` | 主色态边框（hover/focus） |

> 语义色（成功/警告/错误）**用到再加**，不提前设计。

## 六、开发节奏（每加一个功能走 4 步）

```
1. app/ 建页面文件（先能打开）
2. lib/queries.ts 加查询 / 或 supabase/migrations 加表（先有数据）
3. 页面里直接写代码（先跑起来）
4. 出现重复 → 抽组件 / 换变量 / 加触发器
```

## 七、规模化前置清单（触发条件对照 · 2026-08-21 修订）

> 使用方式：每项**触发条件满足时**按「方案」执行，不提前做。已完成项已从清单移除（历史评审记录已随文档精简删除）。

| # | 待办项 | 触发条件 | 方案 |
|---|---|---|---|
| S1 | **CSP 安全头** | 上线前（部署域名定稿后） | 四项基础头已上线（C4）；CSP 需 nonce/hash 方案处理 inline style 与 next/font，单独专项 |
| S2 | **分页 / 缓存** | `discoveries` > 200 条 **或** 任一列表接口响应 > 300ms | queries 层加 `limit/offset` + 游标（created_at 倒序）；**顺带解决**列表卡片收藏/点赞态 N+1（`isFavorited`/`isLiked` 每卡一查 → 批量取） |
| S3 | **queries.ts 拆分** | `lib/queries.ts` > 500 行 **或** 新增第三个领域操作 | 拆 `lib/db/{discoveries,square,interactions,notifications}.ts`，queries.ts 变 re-export |
| S4 | **测试 / CI** | 页面 > 20 **或** 组件 > 30 | 纯函数冒烟已落地（`pnpm test`，覆盖 lib/text、lib/links）；**RLS 读/写、触发器计数等集成测试 + GitHub Actions CI 仍待**（需 Supabase local 栈） |
| S5 | **迁移执行方式** | — | **用户决策（2026-08-23）：不引入 CLI**，迁移由手动复制 SQL 到 Supabase Dashboard 执行；迁移文件仍走 git 版本管理 |
| S6 | **通知中心完整页** | 通知 > 20 条（抽屉预览放不下） | 新建 `/notifications` 完整页（分页 + 全部已读 + 筛选），抽屉只留预览 |
| S7 | **写路径服务端校验** | 上线前（业务规则出现第二个需要强制的场景） | 推广合规等规则收敛：DB CHECK 约束（如 commission 必填）或 Route Handler 统一收口 |
| S8 | **分类上库** | 出现「后台要配分类」的需求 | `categories` 从 `lib/data.ts` 迁 `public.categories` 表 + 管理页（当前静态配置够用，迁移 006 已归一） |
| S9 | **Storage 孤儿文件巡检** | 上线前一次 | 一次性脚本：`storage.objects` 全列对比 users 的 avatar_url/cover_url 与 square_posts.image_url 引用，删除无引用对象 |

**硬红线（任何时候）**：新增第 3 套分类体系 / 第 3 种图标方案前必须先归一；不提交裸 `href="#"`；CSS 单文件 ≤ 400 行；新增写操作先定「RLS / 触发器 / Handler」归属（见 ARCHITECTURE.md §4）。

**演进节奏**：某 feature 目录 > 10 文件再细分；页面 > 8 再模块化；其余按上表触发，不提前设计。

> 一句话：**架构是"涨"出来的，不是"设计"出来的。** 前期多花一分钟做规范，就少一分钟做功能。
