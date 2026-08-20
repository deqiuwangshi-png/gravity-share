# 官网落地页改版方案：导航吸顶 + 删除发布 + 页脚改版

> 状态：待确认 · 文件范围：`app/(marketing)/page.tsx`、`app/(marketing)/marketing.css`
> 原则：极简架构（不新增目录、只用现有色板变量、不写硬编码色值）

---

## 一、改动清单（3 项）

| # | 改动 | 方式 | 风险 |
|---|---|---|---|
| 1 | 顶部导航栏吸顶固定 | 结构微调 + CSS `sticky` | 低（有 1 个坑，见 §1.3） |
| 2 | 删除导航栏「发布」按钮 | 删 1 行 TSX | 无 |
| 3 | 页脚改版为三列 + 版权行 | 重写 footer 结构 + 样式 | 低 |

---

## 二、导航栏吸顶固定

### 2.1 结构改动（page.tsx）

现状：`<header className="container">` 内部是 `<nav className="nav">`。

改为：header 变成全宽吸顶层，nav 负责内容宽度与居中：

```tsx
<header className="site-header">
  <nav className="container nav" aria-label="主导航">
    {/* 现有 logo / nav-links / nav-actions 原样保留 */}
  </nav>
</header>
```

### 2.2 样式（marketing.css 新增）

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--background);          /* 吸顶后不透明，内容滚动不穿帮 */
  border-bottom: 1px solid var(--border); /* 与页面内容的分隔线 */
}
```

> 说明：`background` 必须给（否则吸顶后文字与滚动内容重叠）；分隔线让吸顶状态有视觉边界。若想要"毛玻璃"效果可改用 `background: color-mix(...)` 或半透明 + `backdrop-filter: blur(14px)`（与 app 顶栏一致），但极简优先，先用纯色。

### 2.3 关键坑（必须处理）

`.site-shell` 现有 `overflow: hidden`，**会阻断 sticky 生效**（sticky 依赖滚动容器，overflow:hidden 的祖先会"钉死"它）。

```css
/* 改前 */
.site-shell { min-height: 100vh; overflow: hidden; }
/* 改后：横向裁剪仍防溢出，但不再阻断 sticky */
.site-shell { min-height: 100vh; overflow-x: clip; }
```

---

## 三、删除「发布」按钮

page.tsx 中 `nav-actions` 删除 1 行：

```tsx
{/* 改前 */}
<div className="nav-actions">
  <Link href="/login" className="btn btn-light">登录</Link>
  <Link href="/publish" className="btn btn-primary">发布</Link>
</div>

{/* 改后 */}
<div className="nav-actions">
  <Link href="/login" className="btn btn-light">登录</Link>
</div>
```

连带影响：
- `.btn-primary` 样式将不再被引用（营销页 cta 区用的是无修饰 `.btn`）——**保留** CSS 定义不删（成本为零，未来可能复用）
- `/publish` 路由本身不动（应用内顶栏仍有发布入口）

---

## 四、页脚改版（你确认的三列结构）

### 4.1 目标结构

```
footer
├── 上区（三列 grid）
│   ├── 列1 品牌：Logo + 开放 · 连接 · 发现。
│   ├── 列2 链接：关于引力 | 帮助中心 | 用户协议 | 隐私政策
│   └── 列3 法务：免责声明（浅底强调块：引力仅做展示与连接，不参与交易担保）
└── 下区（版权行）
    ├── 左：© 2026 引力
    └── 右：ICP备案号
```

### 4.2 TSX（page.tsx footer 替换）

```tsx
<footer className="container footer">
  <div className="footer-grid">
    <div className="footer-brand">
      <Logo className="logo" />
      <p>开放 · 连接 · 发现。</p>
    </div>
    <nav className="footer-col" aria-label="站点链接">
      <h3>导航</h3>
      <Link href="#">关于引力</Link>
      <Link href="#">帮助中心</Link>
      <Link href="#">用户协议</Link>
      <Link href="#">隐私政策</Link>
    </nav>
    <div className="footer-col footer-legal">
      <h3>免责声明</h3>
      <p>引力仅做展示与连接，不参与交易担保。内容在哪里发布、交易与交付，仍由原平台负责。</p>
    </div>
  </div>
  <div className="footer-bottom">
    <span>© 2026 引力</span>
    <span>京ICP备XXXXXXXX号</span>
  </div>
</footer>
```

### 4.3 样式（marketing.css：替换旧 .footer 相关）

```css
.footer {
  padding: 64px 0 30px;
  color: var(--text-soft);
  font-size: 13px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1.6fr;
  gap: 48px;
  padding-bottom: 34px;
  border-bottom: 1px solid var(--border);
}

.footer-brand p {
  margin: 14px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.footer-col h3 {
  margin: 0 0 14px;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 600;
}

.footer-col a {
  display: block;
  padding: 5px 0;
  color: var(--text-muted);
  font-size: 13px;
  transition: color 180ms ease;
}

.footer-col a:hover {
  color: var(--primary);
}

/* 免责声明强调块：浅绿底突出提示 */
.footer-legal p {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--radius-control);
  background: var(--primary-soft);
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.7;
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 22px;
  color: var(--text-soft);
  font-size: 12px;
}

@media (max-width: 800px) {
  .footer-grid {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
```

> 旧 `.footer-inner` / `.footer-links` 样式随结构替换删除。
> Logo 复用 `components/logo.tsx`（`className="logo"` 直接用现有品牌字样式，不新增类）。

---

## 五、视觉变化预览（文字描述）

1. **吸顶后**：滚动页面，导航栏始终钉在顶部，下方出现 1px 分隔线
2. **发布按钮消失**：导航右侧只剩「登录」
3. **页脚**：三列（品牌标语 / 4 个链接 / 免责声明浅绿强调块），底部版权行左右分布

---

## 六、待你确认的 3 个点

1. **ICP 备案号**：先用占位「京ICP备XXXXXXXX号」，拿到真实号后替换
2. **免责声明文案**：现用「引力仅做展示与连接，不参与交易担保。内容在哪里发布、交易与交付，仍由原平台负责。」是否 OK（呼应首页"引力不替代原平台"表述）
3. **吸顶样式**：纯色（推荐）还是毛玻璃（`backdrop-filter`，与登录后应用顶栏一致）

确认后我按此落地并跑 lint + build 验证。
