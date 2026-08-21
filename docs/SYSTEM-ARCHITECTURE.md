# 引力（yinli）架构规范 · 一页纸版

> 前期项目 = 极简架构：**四个柜子、三条规则、一个色板**。
> 目标是让任何接手的人（包括非技术的合作方）10 秒看懂。完整技术细节见根目录 `ARCHITECTURE.md`。

---

## 一、四个柜子（目录就这四层）

```
app/          页面柜 —— 一页一个文件，文件名就是网址
styles/       样式柜 —— 全部 CSS 统一管理，按访问区分目录
components/   组件柜 —— 用到两次才抽，平层放，不分子目录
lib/          数据柜 —— 所有数据、类型、配置、图标集中在这
```

```
app/
├── (marketing)/page.tsx       官网落地页 /
├── (auth)/login|register/     登录 / 注册
├── (app)/home|discover|categories|square/
│                              首页 / 发现 / 分类 / 广场
│   ├── discover/[id]/         发现详情（社交动态页）
│   └── square/[id]/           广场话题详情
styles/                        全部 CSS（import 一律 @/styles/...）
├── globals.css                色板 + 全局基础
├── marketing/                 site / sections / legal
├── auth/                      shell / card
└── app/                       shell / discovery / list / modal / announcement /
                               user-menu / settings / feed / square /
                               detail / detail-comments
components/                    访问区 + feature 双层
├── common/                    logo / linkified-text（跨区共享）
├── marketing/                 legal-layout
└── app/                       shell/（7 个）· discovery/（3 个）· square/（3 个）
lib/                           data / types / config / icons / text /
                               discovery-store（发现内容池）/ square-store（广场话题池）
```

> 内容池：client 内存态（刷新还原），发布 → 事件 → 展示实时联动；接后端时整体换数据访问层。

## 二、三条规则（就这些，多了没人遵守）

1. **数据只在 `lib/` 里** —— 页面不写死数据；接后端是独立阶段，届时再设计数据访问层
2. **重复第二次才抽组件** —— 第一次直接写页面里，用到两处了再抽
3. **颜色只用变量** —— 不写色号，改品牌色只改 `styles/globals.css` 一处

## 三、页面范围与访问关系

| 访问区 | 路由 | 访问控制 |
|---|---|---|
| 官网落地页 | `/` | 公开 |
| 认证 | `/login` `/register` | 未登录（mock 阶段：仅页面展示，无真实校验） |
| 应用主页 | `/home` 及模块路由 | 需登录（mock 阶段：守卫未实现，布局验收后再做） |

未登录访问应用路由 → 跳转 `/login`；登录成功 → 回 `/home`。**当前为前端模拟阶段，此守卫尚未实现**，属布局验收后的 P1 项，不提前开发。

## 四、应用主页模块清单（侧边栏导航：首页 / 发现 / 分类 / 广场）

| 状态 | 模块（路由） |
|---|---|
| ✅ 已实现 | 首页 `/home`（聚合：公告 + 为你推荐）、发现 `/discover`（3 列社交卡 + 类型筛选）、发现详情 `/discover/[id]`（发帖头 + 正文 + 外链预览 + 互动 + 评论）、分类 `/categories`、广场 `/square`（领域胶囊 + 话题流）、话题详情 `/square/[id]` |
| ⏳ 待补齐 | 搜索 `/search`、发布独立页 `/publish`（当前为弹窗）、收藏 `/favorites`、我的发布 `/my/publishes`、需求 `/needs`、领域频道 `/fields/[slug]`、个人中心 `/profile`、通知 `/notifications`、设置 `/settings` |

> 原「推荐 /recommend」已并入首页「为你推荐」区块（2026-08-21 四结构调整），`/recommend` 永久重定向到 `/home`。
> 模块之间只通过链接（URL）跳转，不互相引用代码。

模块之间只通过链接（URL）跳转，不互相引用代码。

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
2. lib/ 加数据（先有内容）
3. 页面里直接写代码（先跑起来）
4. 出现重复 → 抽组件 / 换变量
```

## 七、什么时候才升级（不提前设计）

- 某 feature 目录超过 10 个文件 → 再继续细分（当前：components/app 下已分 shell/discovery/square）
- 页面超过 8 个 → 再考虑模块化
- 界面布局验收通过 + 业务方确认 → 才启动后端（接后端时再设计数据访问层，不提前铺路）
- 前端治理红线：不新增第 3 套分类体系 / 第 3 种图标方案；不提交裸 `href="#"`

> 一句话：**架构是"涨"出来的，不是"设计"出来的。** 前期多花一分钟做规范，就少一分钟做功能。
