# 引力（yinli）架构规范 · 一页纸版

> 前期项目 = 极简架构：**三个柜子、三条规则、一个色板**。
> 目标是让任何接手的人（包括非技术的合作方）10 秒看懂。完整技术细节见根目录 `ARCHITECTURE.md`。

---

## 一、三个柜子（目录就这三层）

```
app/          页面柜 —— 一页一个文件，文件名就是网址
components/   组件柜 —— 用到两次才抽，平层放，不分子目录
lib/          数据柜 —— 所有数据、类型、配置集中在这
```

```
app/
├── (marketing)/page.tsx       官网落地页 /
├── (auth)/login|register/     登录 / 注册
├── (app)/home/page.tsx        应用主页 /home
│   └── layout.tsx + app.css   应用壳（侧边栏/顶栏）
components/                    4 个共享组件
├── logo.tsx  app-shell.tsx  app-section.tsx  list-column.tsx
lib/
├── data.ts   全部 mock 数据（未来接后端只改这里）
├── types.ts  全局类型
└── config.ts 导航与发布类型等配置
```

## 二、三条规则（就这些，多了没人遵守）

1. **数据只在 `lib/` 里** —— 页面不写死数据，接真后端只改一个文件
2. **重复第二次才抽组件** —— 第一次直接写页面里，用到两处了再抽
3. **颜色只用变量** —— 不写色号，改品牌色只改 `globals.css` 一处

## 三、页面范围与访问关系

| 访问区 | 路由 | 访问控制 |
|---|---|---|
| 官网落地页 | `/` | 公开 |
| 认证 | `/login` `/register` | 未登录 |
| 应用主页 | `/home` 及模块路由 | 需登录 |

未登录访问应用路由 → 跳转 `/login`；登录成功 → 回 `/home`。

## 四、应用主页模块清单（13 个，按需分批做）

| 优先级 | 模块（路由） |
|---|---|
| P0 已实现 | 发现 `/home` |
| P0 待补齐 | 搜索 `/search`、分类 `/categories`、详情 `/discover/[id]`、发布 `/publish` |
| P1 | 推荐 `/recommend`、收藏 `/favorites`、我的发布 `/my/publishes`、需求 `/needs`、领域频道 `/fields/[slug]`、个人中心 `/profile` |
| P2 | 通知 `/notifications`、设置 `/settings` |

模块之间只通过链接（URL）跳转，不互相引用代码。

## 五、色板（全站就这 15 个颜色变量，定义在 `globals.css`）

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

- `components/` 超过 10 个文件 → 再分子目录
- 页面超过 8 个 → 再考虑模块化
- 要接真后端 → 才把 `lib/data.ts` 换成 fetch 调用

> 一句话：**架构是"涨"出来的，不是"设计"出来的。** 前期多花一分钟做规范，就少一分钟做功能。
