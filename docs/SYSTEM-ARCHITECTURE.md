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
supabase/     迁移柜 —— 数据库唯一真相（001-004，幂等可重跑）
```

```
app/
├── (marketing)/  落地页 / + 法律页
├── (auth)/       登录 / 注册 / 忘记密码
└── (app)/        home / discover(+[id]) / categories(+[slug]) /
                 square(+[id]) / profile(+[id] 他人主页)
styles/
├── globals.css   色板 + 全局基础
├── marketing/ · auth/ · app/（13 文件，单文件 ≤400 行）
components/
├── common/       logo / linkified-text / author-link / avatar-box
├── marketing/    legal-layout
└── app/          shell/（10）· discovery/（4）· square/（4）
lib/
├── queries.ts    查询层：读 + 互动/通知操作（DTO 映射，注入双端 client）
├── storage.ts    图片上传 / 公开 URL
├── supabase/     client.ts（浏览器）/ server.ts（cookie 会话）
├── data.ts       静态配置（分类 / 公告 / 热词）
└── types / config / icons / text
supabase/migrations/   001 users → 002 内容 → 003 互动通知 → 004 存储
```

> 数据：**全部在 Supabase**（9 张表 + 3 存储桶 + RLS + 触发器）。页面不写死数据，读走 `lib/queries.ts`，写靠 RLS 保护。

## 二、三条规则（就这些，多了没人遵守）

1. **数据只在 `lib/` 里拿** —— 页面不写死数据；内容/评论/互动/通知全走查询层
2. **重复第二次才抽组件** —— 第一次直接写页面里，用到两处了再抽
3. **颜色只用变量** —— 不写色号，改品牌色只改 `styles/globals.css` 一处

## 三、页面范围与访问控制（真实守卫已生效）

| 访问区 | 路由 | 访问控制 |
|---|---|---|
| 官网落地页 | `/` 及法律页 | 公开 |
| 认证 | `/login` `/register` `/forgot-password` | 已登录自动跳 `/home` |
| 应用主页 | `/home` `/discover*` `/categories*` `/square*` `/profile*` | **需登录**（proxy.ts 守卫，未登录 → `/login?next=...`） |

登录：邮箱密码 + 邮箱验证（Supabase Auth 托管）；会话：cookie（@supabase/ssr）。

## 四、已实现模块清单

| 模块（路由） | 说明 |
|---|---|
| 首页 `/home` | 公告走马灯 + 为你推荐（读库） |
| 发现 `/discover` | 3 列社交卡 + 类型筛选；详情 `/discover/[id]` 社交动态页（正文/外链/点赞/评论落库） |
| 分类 `/categories` | 入口页动态计数 + 分类详情 `/categories/[slug]` |
| 广场 `/square` | 领域胶囊 + 话题流；详情 `/square/[id]`（点赞/评论/配图） |
| 个人 `/profile` | 我的主页（资料/发布/收藏）+ 他人主页 `/profile/[id]`（关注按钮/粉丝数） |
| 发布 | 弹窗三入口：推荐 / 推广（合规标识）/ 话题（可配图），写库后列表实时刷新 |
| 通知 | 顶栏铃铛 + 预览抽屉：互动（赞/评/关）自动触发，点条目已读跳转 |
| 头像/封面 | 设置面板传头像、个人主页换封面、广场发帖配图（公开桶） |

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

## 七、什么时候才升级（不提前设计）

- 某 feature 目录超过 10 个文件 → 再继续细分
- 页面超过 8 个 → 再考虑模块化
- `lib/queries.ts` 超 500 行或新增领域 → 拆 `lib/db/`
- 新增写操作 → 先定「RLS / 触发器 / Handler」归属
- 上线前置：分页/缓存、服务端业务校验、测试 CI、安全头（见 ARCHITECTURE-REVIEW.md v3）
- 前端治理红线：不新增第 3 套分类体系 / 第 3 种图标方案；不提交裸 `href="#"`；CSS 单文件 ≤ 400 行

> 一句话：**架构是"涨"出来的，不是"设计"出来的。** 前期多花一分钟做规范，就少一分钟做功能。
