# 引力架构评估报告 v3

> 版本：v3.0 · 日期：2026-08-21 · 评审范围：全库（73 文件 / 8,193 行 / 17 路由）+ Supabase 数据层（4 迁移）
> 对比基准：v2 评审（同日 15:05，61 文件 / 5,768 行 / 16 路由）
> 结论先行：**v2 识别的 P1 风险已解决 4.5/5，数据层从 mock 平滑过渡到 Supabase BaaS 且无结构性返工；新风险集中在「业务规则的位置」（触发器/SQL）与「规模化前置」（缓存/分页/服务端校验/测试），无结构性硬伤。**

---

## 一、状态快照（实测 21:45）

| 指标 | v1 | v2 | v3 | 变化 |
|---|---|---|---|---|
| 源码文件 | 34 | 61 | **73** | +12（queries/storage/supabase 客户端/avatar/author-link） |
| 总行数 | 3,851 | 5,768 | **8,193** | +42% |
| app / components / lib / styles | 584/452/165/2,650 | 835/941/402/3,590 | 1,157/1,840/742/4,454 | 全层增长 |
| 路由 | 14 静态 | 14+2 动态 | **15 静态 + 2 动态**（+`/profile/[id]`） | 他人主页 |
| 组件 | 10 平层 | 24 双层 | **22**（common 4 · shell 8 · discovery 5 · square 4 · marketing 1） | 双层稳定 |
| CSS | 4 文件（1,312 超标） | 14 全 ≤400 | **19 文件全 ≤400**（最大 modal 391） | 治理线保持 |
| 死链 / TODO | 18 / — | 0 / — | **0 / 0** | 达标 |
| 内容池（内存态） | 无 | 2 个 | **0（已退役，双 store 删除）** | P0-1 解决 |
| 状态库 | 无 | 无 | 无（事件仅作「数据变更→refetch」信号） | 保持零依赖 |
| 数据层 | mock 常量 | mock 常量 + 内存池 | **Supabase：9 表（users/3 内容/4 互动通知/follows）+ 3 存储桶 + 34 个 RLS 策略 + 6 个触发器函数** | 接后端完成 |
| lint + build | 通过 | 通过 | **通过（17 页）** | — |

---

## 二、当前架构全景

### 分层结构（四柜 + Supabase 数据层）

```
app/            页面柜：marketing(7) / auth(4) / app(6 页 + 2 动态 + profile/[id])
components/     组件柜：common(4 含 AuthorLink/AvatarBox) + app 下 shell·discovery·square
lib/            数据柜：queries(386 查询层) storage(55) supabase/client·server types data config icons text
styles/         样式柜：19 文件，按访问区 + 组件拆分，全 ≤400
supabase/       migrations 001-004：users → 内容 → 互动通知 → 存储（幂等可重跑）
```

### 数据流（读走查询层，写走 RLS，业务规则在触发器）

```
[读] server 页面 / client 组件 → lib/queries.ts（注入双端 client）→ Supabase REST → DTO（authorName/authorAvatar join users）
[写] 发布/评论/点赞/收藏/关注/已读 → 组件内 createClient().insert/update（RLS 校验本人/作者）
[规则] 计数（likes/comments）+ 互动→通知（like/comment/follow）→ 数据库触发器（security definer，6 个函数）
[存储] 头像/封面/广场配图 → Storage 公开桶（随机名）→ 表存 path → 展示拼公开 URL
[信号] 写库成功后 dispatchEvent → 列表组件 refetch（事件语义从「内存联动」降级为「刷新提示」）
```

- **依赖单向**：页面 → 组件 → lib → Supabase，无反向无循环；
- **mock 归零路径**：data.ts 仅剩静态配置（categories/公告/热词），内容/评论/通知/互动全部真库；
- **DTO 收敛**：DiscoveryItem 19 字段 → DiscoveryDTO（queries.ts 一处映射），组件零兜底逻辑。

### v2 关键决策的兑现情况

| v2 P1 项 | 状态 | 落点 |
|---|---|---|
| P1-4 DiscoveryItem 字段膨胀 | ✅ 解决 | DiscoveryDTO 收敛，queries.ts 统一映射 |
| P1-5 两套评论 | ✅ 解决 | comments 表归一（target_type 区分） |
| P1-6 data.ts 膨胀 | ✅ 解决 | 瘦身至 ~60 行静态配置 |
| P0-1 内存态内容池 | ✅ 解决 | 双 store 退役删除，发布直接写库 |
| P1-3 Client 化 | ⚠️ 形态变化 | 页面层 server 化推进（home/categories/marketing/square[id]/profile 均 server + 动态），组件层因交互密集保持 client（91%）——风险从「SSR 浪费」转为「组件直查库的请求面」 |
| P1-2 文档同步 | ❌ 遗留 | ARCHITECTURE.md 仍停 v2.5，未含 2a-2c/Supabase 数据层 |

---

## 三、技术选型评估

| 维度 | 评分 | 说明 |
|---|---|---|
| **合理性** | ★★★★☆ | Next 16 + TS strict + Supabase BaaS（Auth/Postgres/RLS/Storage/触发器）与「能力全用托管，只写接线+UI+业务」原则一致；RLS 作为唯一安全防线成立 |
| **可扩展性** | ★★★★☆ | 四柜 + 双层组件 + 迁移版本化（001→004 幂等）闭环；queries.ts 386 行接近拆分阈值 |
| **可维护性** | ★★★★☆ | 死链 0、无 any 泄漏（Row 类型显式）、lint+build 恒定通过；CSS 19 文件全 ≤400；迁移文件即数据层文档 |
| **性能** | ★★★☆☆ | force-dynamic 页面每次访问查库、client 列表每次挂载查库、无缓存/分页——MVP 规模无碍，上线前需补（见 P1-3） |
| **安全性** | ★★★★☆ | RLS 全覆盖（内容公开读+作者写、互动/通知本人、follows 公开读、storage 目录绑 uid）；service_role 零前端；触发器 security definer + search_path 固定；⚠️ 无服务端业务校验（发推广无合规拦截） |
| **一致性** | ★★★☆☆ | 文档滞后唯一失分项：ARCHITECTURE.md v2.5 / SYSTEM-ARCHITECTURE.md 均未含 Supabase 数据层与 2a-2c 演进 |

---

## 四、风险与问题清单（按优先级）

### P0（知悉，无需立即处理）

| # | 问题 | 说明 |
|---|---|---|
| 1 | **业务规则在数据库触发器** | 计数 + 互动→通知逻辑在 SQL（security definer）。方向正确（事务一致性），但意味着「规则一部分在代码、一部分在数据库」——迁移文件是唯一真相，改规则必须走新迁移，不能只改代码 |

### P1（上线前 / 下一阶段必须处理）

| # | 问题 | 影响 | 建议 |
|---|---|---|---|
| 2 | **文档同步滞后 4 轮** | ARCHITECTURE.md v2.5 未含 2a（资料编辑）、2b（内容上库/queries/DTO）、2c（互动通知/他人主页）、S（存储/头像/配图）；SYSTEM-ARCHITECTURE、GOVERNANCE 进度同样未补 | 本报告评审后一次性同步（结构树 + 模块清单 + 数据层章节 + 进度表），纳入 R4 提交自检 |
| 3 | **查询无缓存/分页** | 首页/营销页/分类页 force-dynamic 每次查库；列表页 client 每次挂载全量拉取 | 数据量 ≤ 百级可接受；触发「分页」= discoveries > 200 或列表响应 > 300ms；届时上 limit/offset + 游标 |
| 4 | **client 直写库无服务端业务校验** | 发布/推广/评论全靠 RLS 身份校验，无业务规则（如推广需合规字段、评论频率限制、敏感词） | 现阶段成立（RLS 是安全线）；上线前将「写路径」收敛到 Route Handler 或数据库约束/触发器（推广必填 commission 可先用 CHECK 约束） |
| 5 | **queries.ts 386 行单文件** | 查询 + DTO 映射 + 互动/通知操作混居，接近维护阈值 | 触发拆分：>500 行或新增第三个领域操作时拆 `lib/db/{discoveries,square,interactions,notifications}.ts` |
| 6 | **data-placeholder 13 处含误导项** | 多数为合规占位（R2 规则允许），但 auth 页「使用 GitHub 继续」是用户会点的（假按钮） | GitHub 登录按钮标注「即将上线」或移除；营销页「查看更多」等建议链到真实页（/discover、/categories） |
| 7 | **通知无系统类来源** | 通知表只由互动触发器产生；老用户「暂无通知」是常态 | 可接受（公告走马灯承担系统消息）；如要系统通知，做一次 seed 迁移即可 |

### P2（规模化触发）

| # | 问题 | 触发点 | 建议 |
|---|---|---|---|
| 8 | 测试 / CI 缺失 | 页面 > 20 或组件 > 30 | vitest + 冒烟（至少覆盖 RLS 读写、触发器计数、404 兜底三条链路） |
| 9 | next.config 无安全头 | 上线前 | 补 headers（X-Frame-Options / X-Content-Type-Options / Referrer-Policy） |
| 10 | Storage 旧图不清理 | 头像/封面换图累积 | 换图时 storage.remove 旧对象（可做「删除旧 path」工具函数） |
| 11 | 通知中心完整页 | 通知 > 20 条 | 抽屉只留预览，另建 /notifications 完整页（v1 曾做后被移除，需求可复用） |

---

## 五、优化建议与演进方向

### 演进路线（已走完数据上库，进入「规模化前置」）

```
阶段 0（治理闭环）→ 阶段 1（接后端）✅ 提前完成 → 阶段 2（规模化前置）
```

- **已提前完成**：v2 路线图中「阶段 1 必做」的数据层迁移（内容池→查询层、DTO 收敛、评论归一）已在 2a-2c 落地，且未推倒任何 UI；
- **下一优先级**：① 文档同步（P1-2）→ ② 上线前置（安全头、GitHub 按钮、写路径服务端校验）→ ③ 规模化触发项（分页/缓存、测试 CI、queries 拆分、通知中心）。

### 架构治理建议（四条）

1. **文档即契约（拉齐）**：本轮 4 个阶段（2a/2b/2c/S）改动横跨结构树、数据层、路由——评审后必须一次性同步 ARCHITECTURE.md + SYSTEM-ARCHITECTURE.md + GOVERNANCE 进度，此后每轮改动随改随更；
2. **数据层文档化**：迁移文件（001-004）是数据库唯一真相——新增 005 时必须在文件头注释变更动机与触发条件，保持「SQL 即文档」；
3. **写路径收敛纪律**：新写操作（除已授权的互动类）一律先问「这条规则该在 RLS / 触发器 / Route Handler 哪一层」——RLS 管身份、触发器管数据一致性、Handler 管业务校验；
4. **占位元素审计**：data-placeholder 是治理规则 R2 的合规工具，但「看起来可点」的假按钮（GitHub 登录）除外，需标注或移除。

---

## 六、总体结论

从 v2 到 v3，架构完成了**最关键的一次跃迁：数据层从 mock 世界整体迁移到 Supabase BaaS 真库**，且验证了当初「内容池是临时机制、勿做持久化假设」的边界判断——收藏、互动、通知全部绕开内存态直接落库，无一返工。

| 跃迁 | 状态 |
|---|---|
| 四柜治理 + 双层组件 + CSS 全达标 | ✅ 保持 |
| mock 内容池 → **Supabase 查询层 + RLS 直写 + 触发器** | ✅ 完成（P0/P1 四项解决） |
| 19 字段实体 → **DTO 收敛**；两套评论 → **单表归一** | ✅ 完成 |
| 纯前端 → **Auth + 内容 + 互动通知 + Storage 存储全托管** | ✅ 完成 |

**当前架构对「产品迭代 + 已接 BaaS」是最优解：分层清晰、安全基线成立（RLS 全覆盖）、无债务堆积。** 剩余风险集中在三处，均有明确触发点与对策：文档同步（一次性补齐）、写路径业务校验（上线前收敛）、规模化前置（分页/缓存/测试）。无需推倒重来，按 P1 清单逐项执行即可。

*报告完成。评审数据实测于 2026-08-21 21:45（73 文件 / 8,193 行 / 17 路由 / 4 迁移）。*
