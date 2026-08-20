# 认证页审查 + 忘记密码页设计

> 状态：待确认 · 范围：`app/(auth)/`（不改配色与背景）
> 原则：配色/背景不动（用户认可现状）；只做表单合理性与响应式审查、小改动、新增忘记密码页

---

## 一、认证页审查结论（登录 / 注册）

### 1.1 表单设计 —— 已达标 ✅

| 项 | 现状 | 评价 |
|---|---|---|
| 字段精简 | 登录 2 项（邮箱/密码）、注册 3 项（+昵称） | ✅ 无冗余输入 |
| 输入校验 | `type="email"`、`required`、`minLength=8` | ✅ |
| 密码可见性 | 显示/隐藏切换按钮 | ✅ 现代标配 |
| 辅助入口 | 记住我、忘记密码 | ✅ |
| 社交登录 | GitHub（mock） | ✅ SaaS 标配 |
| 模式切换 | 登录/注册 tab 互跳 | ✅ |
| 无障碍 | label、aria-label、role="status" | ✅ 基础达标 |
| 布局 | 双栏（品牌面板 + 表单面板） | ✅ 主流做法（Linear/Vercel 同款） |

### 1.2 表单设计 —— 建议优化 ⚠️（不碰视觉）

1. **autocomplete 属性缺失（最重要）**：现代浏览器自动填充与密码管理器依赖它
   - 邮箱 `autoComplete="email"`、登录密码 `autoComplete="current-password"`、注册密码 `autoComplete="new-password"`、昵称 `autoComplete="nickname"`
2. **忘记密码链接占位**：`href="#"` → 指向新页面 `/forgot-password`
3. **协议/隐私链接占位**：`auth-legal` 的"用户协议/隐私政策"目前 `href="#"` → 接通 `/terms`、`/privacy`（页面已存在，顺手修复）

### 1.3 响应式 —— 已达标 ✅（无需改动）

- 820px 断点：双栏折叠为单栏（品牌面板在上，min-height 390px）
- 480px 断点：padding 收紧、标题字号缩小
- `clamp()` 自适应内边距、`100svh` 视口单位
- 结论：响应式骨架合理，品牌面板窄屏保留符合主流做法

---

## 二、忘记密码页设计

### 2.1 路由与组件

```
app/(auth)/
├── forgot-password/page.tsx      /forgot-password
└── _components/forgot-form.tsx   忘记密码表单（新组件，client）
```

自动继承 auth 布局（品牌面板 + 表单面板），**零新增 CSS**（全部复用 `.auth-*` 类）。

### 2.2 交互流程（单页双态，mock）

```
态 1：输入邮箱 ──提交──▶ 态 2：成功提示
"重置密码"             "检查你的邮箱"
输入注册邮箱，我们将     如果该邮箱已注册，你会收到
发送密码重置链接。        一封重置链接邮件（30 分钟内有效）。
[发送重置链接]           [返回登录]
```

### 2.3 表单要点

- 字段：仅邮箱（`type="email"` + `autoComplete="email"` + `required`）——不要求输入新密码，标准做法是邮件里带链接跳转
- **安全文案**：成功态统一提示"如果该邮箱已注册…"，**不暴露邮箱是否存在**（防账号枚举，专业做法）
- 底部返回登录链接
- 提交按钮复用 `.auth-submit` 样式

### 2.4 代码骨架

```tsx
// forgot-form.tsx（节选）
export default function ForgotForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="auth-card">
        <div className="auth-heading">
          <p className="auth-kicker">检查你的邮箱</p>
          <h2>重置链接已发送</h2>
          <p>如果该邮箱已注册，你会收到一封包含重置链接的邮件，链接 30 分钟内有效。</p>
        </div>
        <Link className="auth-submit" href="/login">返回登录</Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-heading">
        <p className="auth-kicker">找回密码</p>
        <h2>重置密码</h2>
        <p>输入注册邮箱，我们将发送密码重置链接。</p>
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label><span>邮箱</span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
        <button className="auth-submit" type="submit">发送重置链接<span aria-hidden="true">→</span></button>
      </form>
      <p className="auth-switch-copy">想起来了？<Link href="/login">返回登录</Link></p>
    </div>
  );
}
```

---

## 三、执行清单（确认后执行）

1. `auth-form.tsx`：补 autocomplete ×4、忘记密码链接 → `/forgot-password`
2. `auth layout`：`auth-legal` 协议/隐私链接接通 `/terms`、`/privacy`
3. 新建 `_components/forgot-form.tsx` + `forgot-password/page.tsx`
4. `pnpm lint` + `pnpm build` 验证（新增 1 路由 → 12 页）

## 四、待确认 3 点

1. 优化清单（autocomplete ×4、忘记密码链接、协议链接接通）——OK？
2. 忘记密码流程：单页双态（输入 → 成功提示，推荐）还是保持更简单（一屏提示）？
3. 成功态是否采用"不暴露邮箱是否存在"的安全文案（推荐）？

---

## 五、落地记录（2026-08-20 已确认并完成）

- `auth-form.tsx`：昵称 `autoComplete="nickname"`、邮箱 `email`、登录密码 `current-password`、注册密码 `new-password`；「忘记密码？」→ `/forgot-password`
- `(auth)/layout.tsx`：`auth-legal` 用户协议/隐私政策接通 `/terms`、`/privacy`
- 新增 `app/(auth)/_components/forgot-form.tsx`（单页双态：输入邮箱 → 成功提示"如果该邮箱已注册…30 分钟内有效"，不暴露账号存在；成功态返回登录按钮复用 `.auth-submit` 样式）+ `app/(auth)/forgot-password/page.tsx`
- 零新增 CSS（全部复用 `.auth-*`）；验证 lint 0 错、build 通过（12 路由静态生成）
