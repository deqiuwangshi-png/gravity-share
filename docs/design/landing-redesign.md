# 官网落地页改版方案：SaaS 五段式（Who-Why-What-How-Action）

> 状态：**已落地（2026-08-20）** · 范围：`app/(marketing)/page.tsx` + `marketing.css`
> 原则：沿用极简架构（色板 15 变量、无硬编码、无装饰图标）；导航吸顶 / 删发布 / 新页脚（上一轮成果）全部保留

---

## 一、改版逻辑：五段式映射

现代 SaaS 落地页按「为谁 → 为什么 → 有什么 → 怎么用 → 行动」组织，引力现有内容按此重组并补齐缺口：

| 段 | 作用 | 落地区块 | 现状 |
|---|---|---|---|
| **Who** | 为谁而做、价值主张 | Hero：一句主张 + 搜索入口 | 已有，保留 |
| **Why** | 为什么需要（痛点） | 痛点区「好东西散落各处」 | **新增** |
| **Who** | 两类用户场景 | 双画像：寻找者 / 分享者 | 已有，后移 |
| **What** | 提供什么 | 8 分类 + 正在被发现（内容示例） | 已有，保留 |
| **How** | 怎么用 | 三步走：发现 → 了解 → 分享 | **新增** |
| **Why** | 凭什么信（信任） | 引力的原则 | 已有，保留 |
| **Action** | 行动召唤 | 搜索框 / 「加入引力」CTA | 已有，保留 |

## 二、目标区块顺序

```
Hero（Who：价值主张 + 搜索）
  ↓
痛点（Why：散落、难发现、被埋没）          ← 新增
  ↓
双画像（Who：寻找者 / 分享者）
  ↓
分类 + 正在被发现（What：内容与示例）
  ↓
三步走（How：发现 → 了解 → 分享）         ← 新增
  ↓
定价（"现在免费"，支撑"定价"导航）         ← 新增（极简）
  ↓
引力的原则（Why：信任）→ id 改为 #about
  ↓
FAQ（帮助，3 条，支撑"帮助"导航）          ← 新增（极简）
  ↓
CTA（Action：加入引力）
  ↓
页脚（保留上一轮改版成果）
```

## 三、新增块文案草稿

### 3.1 痛点区（id=problem）

- kicker：为什么需要引力
- 标题：**好东西很多，但都散落在各自的角落。**
- 描述：好文章、好工具、好作品、好课程，各自待在各自的平台里，被孤岛隔开。你常常记得"有这么个好东西"，却想不起在哪里见过。
- 三张痛点卡片：
  1. **平台割裂** —— 内容分散在几十个平台，每个都要单独逛一遍
  2. **发现靠运气** —— 搜索靠猜、推荐靠算法，好东西经常擦肩而过
  3. **被埋没** —— 好作品没人看见，发布完就沉底

### 3.2 三步走（id=how）

- kicker：如何使用引力
- 标题：**三步，让好东西相遇。**
- 步骤：
  1. **发现** —— 搜索、浏览分类，找到你感兴趣的东西
  2. **了解** —— 查看详情，去原平台获取完整内容
  3. **分享** —— 把你发现的好东西发布出来，让更多人看见

## 四、导航与登录按钮改版（用户补充要求）

### 4.1 导航链接：首页 / 定价 / 关于 / 帮助

```tsx
{/* 改前 */}
<div className="nav-links">
  <Link href="#discover">发现</Link>
  <Link href="#categories">分类</Link>
  <Link href="#principle">推荐</Link>
  <Link href="#about">关于引力</Link>
</div>

{/* 改后 */}
<div className="nav-links">
  <Link href="/">首页</Link>
  <Link href="#pricing">定价</Link>
  <Link href="#about">关于</Link>
  <Link href="#help">帮助</Link>
</div>
```

锚点映射（新增/调整的区块 id 见 §二顺序图）：

| 导航 | 指向 | 区块 |
|---|---|---|
| 首页 | `/` | 顶部（当前页） |
| 定价 | `#pricing` | 新增极简定价区（§4.3） |
| 关于 | `#about` | 「引力的原则」区（id 由 `#principle` 改 `#about`） |
| 帮助 | `#help` | 新增极简 FAQ 区（§4.4） |

### 4.2 登录按钮：透明 → 实心主色

```tsx
{/* 改前：btn-light 透明，和链接分不清 */}
<Link href="/login" className="btn btn-light">登录</Link>

{/* 改后：btn-primary 实心主色，与文字链接明显区分 */}
<Link href="/login" className="btn btn-primary">登录</Link>
```

- `.btn-primary` 样式已存在（主色底 + 白字，`marketing.css`），无需新 CSS
- 视觉结果：导航左侧 4 个文字链接，右侧一个绿色实心「登录」按钮

### 4.3 定价区（id=pricing，极简，约 15 行）

```tsx
<section className="section container" id="pricing">
  <div className="section-head">
    <div><h2 className="section-title">现在免费。</h2><p className="section-desc">引力本身不收费：发现与分享完全开放，未来的增值服务会提前公示。</p></div>
    <Link className="more" href="/register">加入引力 <span aria-hidden="true">→</span></Link>
  </div>
</section>
```

> 样式直接复用 `.section` / `.section-head` / `.section-title`，不新增 CSS。

### 4.4 FAQ 区（id=help，极简，约 20 行）

```tsx
<section className="section container" id="help">
  <div className="section-head"><div><h2 className="section-title">常见问题</h2><p className="section-desc">还有什么想了解的？</p></div></div>
  <div className="faq-list">
    <div className="faq-item"><h3>引力和原平台是什么关系？</h3><p>引力只做展示与连接。内容在哪里发布、交易与交付，仍由原平台负责。</p></div>
    <div className="faq-item"><h3>发布需要什么条件？</h3><p>注册后即可发布，提供一条链接和一段介绍就够了。</p></div>
    <div className="faq-item"><h3>有收费计划吗？</h3><p>当前完全免费。如果未来推出增值服务，会提前公示。</p></div>
  </div>
</section>
```

```css
/* marketing.css 新增（复用色板变量） */
.faq-list {
  display: grid;
  gap: 12px;
}

.faq-item {
  padding: 20px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.faq-item h3 {
  margin: 0 0 8px;
  font-size: 15px;
}

.faq-item p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.7;
}
```

## 五、保留与微调

| 区块 | 处理 |
|---|---|
| Hero / 搜索 / 热词 | 原样保留 |
| 双画像 | 原样保留，位置后移到痛点之后；id 由 `about` 改 `who`（避免与"关于"混淆） |
| 8 分类 + 内容卡片 | 原样保留 |
| 引力的原则 | 原样保留；id 由 `principle` 改 `about`（导航「关于」指向） |
| CTA | 原样保留 |
| 导航链接 | 改为：首页 `/`、定价 `#pricing`、关于 `#about`、帮助 `#help`（见 §四） |
| 登录按钮 | `btn-light` → `btn-primary` 实心（见 §4.2） |

## 六、视觉与样式

- 痛点区：三卡片 grid（复用 `.card` 风格），每张卡片：小标签（平台割裂/发现靠运气/被埋没）+ 标题 + 描述，无图标纯文字
- 三步区：三列 grid，每步：大号序号（01/02/03）+ 标题 + 描述
- 定价区：复用 `.section` / `.section-head`，不新增 CSS
- FAQ 区：`.faq-list` / `.faq-item`（约 20 行，见 §4.4）
- 全部使用现有色板变量（`var(--border)` 卡片边框、`var(--primary)` 序号/kicker、`var(--text-muted)` 描述）
- 新增文案属落地页专属，直接内联在 `page.tsx`（极简口径：跨页复用才进 `lib/`）

## 七、执行清单（确认后执行）

1. `page.tsx`：重排区块顺序；新增痛点区、三步走、定价区、FAQ 区；导航改 4 链接；登录改实心按钮；区块 id 调整（who / about / pricing / help）
2. `marketing.css`：新增 `.problem-card` / `.steps` / `.step` / `.faq-list` / `.faq-item` 样式（合计约 60 行，全部用色板变量）
3. `pnpm lint` + `env -u NODE_OPTIONS pnpm build` 验证

## 八、待确认 3 点

1. **区块顺序**：痛点 → 双画像 → 内容 → 三步 → 定价 → 原则 → FAQ → CTA（推荐，完整 SaaS 节奏）；如嫌长可去掉定价/FAQ 之一，导航锚点改占位
2. **痛点区样式**：三卡片（推荐）还是纯文字段落？
3. **三步走命名**：「发现 / 了解 / 分享」还是「发现 / 打开 / 发布」？

确认后我按此落地。

---

## 九、微调方案：FAQ 三列对齐 + Hero 搜索栏静态化（待确认）

### 9.1 FAQ 改为三列等宽居中

现状：`.faq-list` 是单列纵向（`gap: 12px`），3 个卡片竖排。

改法（marketing.css）：

```css
/* 改前 */
.faq-list {
  display: grid;
  gap: 12px;
}

/* 改后：3 个卡片同一行等宽，居中由 .container 保证 */
.faq-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px; /* 与其他卡片区（problem/steps）间距一致 */
}
```

- `repeat(3, 1fr)`：3 列等宽铺满容器，天然居中
- 卡片内边距不变（20px 24px），标题与正文左对齐（与其他卡片区一致）
- 响应式：800px 断点折叠为单列（加入现有 1fr 折叠组）

### 9.2 Hero 搜索栏静态化（零 JS、无跳转）

现状：`<form action="/discover">` + 提交按钮——点击会跳 `/discover?q=…`，而该路由尚未实现（会 404）。

改法（page.tsx，**保持 Server Component，不引入任何 JS**）：

```tsx
{/* 改前 */}
<form className="search-box" action="/discover" role="search">
  <span className="search-icon" aria-hidden="true">⌕</span>
  <input name="q" type="search" placeholder="你正在寻找什么？例如：AI工具、Python教程、3D模型……" aria-label="搜索资源" />
  <button className="search-button" type="submit">开始发现</button>
</form>

{/* 改后：div 静态演示 */}
<div className="search-box" role="search">
  <span className="search-icon" aria-hidden="true">⌕</span>
  <input name="q" type="search" placeholder="你正在寻找什么？例如：AI工具、Python教程、3D模型……" aria-label="搜索资源" />
  <button className="search-button" type="button">开始发现</button>
</div>
```

- `form` → `div`：不再存在表单提交行为
- 按钮 `type="submit"` → `type="button"`：点击无任何动作
- 输入框保留可输入（演示手感），不触发跳转
- `role="search"` 保留无障碍语义；CSS 零改动（`.search-box` / `.search-button` 样式直接复用）

### 9.3 已确认并落地（2026-08-20）

1. **搜索热词**：`href` 暂改 `#` 占位（静态一致，搜索页实现后还原）
2. **输入框**：加 `readOnly` 完全只读

落地记录：`.faq-list` 三列等宽（800px 折叠单列）；搜索区 `form`→`div`、按钮 `type="button"`、输入框 `readOnly`、热词 `href="#"`；lint 0 错、build 通过。

### 9.4 定价区视觉改版（已回退 2026-08-20）

- 曾尝试改版为"绿色胶囊 + 居中标题 + 实心 CTA"，用户审阅后不满意，**已完整还原**为原结构（`section-head`：标题「现在免费。」+ 描述 + 右侧「加入引力 →」链接）。
- `.pricing` 系列样式已从 marketing.css 删除；`.principle` 的分区细线（border-top）为用户明确要求，保留。

### 9.5 用户协议与隐私政策页（已落地 2026-08-20）

- 新增 `app/(marketing)/terms/page.tsx`（/terms）、`app/(marketing)/privacy/page.tsx`（/privacy），纯静态。
- 共享布局 `components/legal-layout.tsx`：独立极简法律页（Logo + 返回首页 + 标题 + 更新时间 + 章节 + 版权行），限宽 720px 居中。
- 各 8 章节模板级文案（用户协议含"平台责任边界：仅做展示与连接不参与交易担保"；隐私政策含收集/使用/共享/存储/权利/未成年人等）。**正式上线前需替换为法务校准文本**。
- `marketing.css` 追加 `.legal-*` 样式（约 40 行，全色板变量）；落地页页脚"用户协议/隐私政策"链接接通 /terms、/privacy。
- 验证：lint 0 错、build 通过（9 路由静态生成）。

### 9.6 关于引力与帮助中心页（已落地 2026-08-20）

- 新增 `app/(marketing)/about/page.tsx`（/about，4 节：为什么做引力/我们相信/引力的原则/联系我们）、`app/(marketing)/help/page.tsx`（/help，4 组问答：入门/发布/账号/常见问题）。
- 复用 `components/legal-layout.tsx`（`updated` 改为可选，About/Help 不显示更新时间）。
- `marketing.css` 追加 `.legal-section h3`（问答标题）与 `.legal-link`（正文内链接）约 8 行。
- 链接接通：顶部导航「关于」→ /about、「帮助」→ /help；页脚「关于引力/帮助中心」→ /about、/help。
- 验证：lint 0 错、build 通过（11 路由静态生成）。
