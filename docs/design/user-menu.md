# 用户头像下拉菜单设计方案

> 状态：待确认 · 范围：`components/user-menu.tsx`（新）+ `app-shell.tsx` + `app.css`
> 设计基准：GitHub / Notion / Linear 的用户菜单交互与视觉惯例

---

## 一、交互逻辑（行业标准）

| 交互 | 行为 |
|---|---|
| 打开 | **点击**头像展开（不用 hover——移动端友好、避免误触） |
| 关闭 | ① 点击菜单外部 ② 按 Esc ③ 点击任一菜单项后自动关闭 |
| 切换 | 再点头像收起（toggle） |
| 菜单项 | 跳转对应页面 / 占位后关闭；「退出登录」mock 跳转 /login |
| 无障碍 | 按钮 `aria-haspopup="menu"` + `aria-expanded`；面板 `role="menu"` |

实现：`useState(open)` + `useRef` 容器 + `useEffect` 监听全局 `click`（判断点击是否在容器外）与 `keydown`（Esc）——这是行业标准的外点关闭模式。

## 二、视觉风格（行业最优）

```
┌────────────────────────────┐
│ [U] 我的账户                │ ← 头部：头像 + 昵称 + 角色
│     普通用户                │
│ ────────────────────────  │
│  ◇ 个人主页                 │
│  ⌘ 发布管理                 │
│  ◈ 账户安全                 │
│  ? 帮助中心                 │
│ ────────────────────────  │
│  ⏻ 退出登录                 │ ← 危险操作：红色文字
└────────────────────────────┘
```

| 项 | 设计 |
|---|---|
| 容器 | `var(--surface)` 白底 + 1px `var(--border)` 细边框 + 12px 圆角 + `var(--shadow-card)` 柔和阴影 |
| 宽度 | 208px，**右上对齐头像**（`position: absolute; right: 0; top: calc(100% + 8px)`） |
| 头部 | 用户信息卡（头像 + 昵称 + 角色），底部 1px 分隔线——GitHub/Notion 同款 |
| 菜单项 | 字符图标 + 文字，`padding: 10px 14px`，hover 背景 `var(--bg-hover)` |
| 危险项 | 「退出登录」文字红色（新增语义色 `--error: #c0392b`，符合"语义色用到再加"） |
| 动画 | 展开淡入 + 上移 4px（150ms，克制） |
| 分隔 | 组与组之间 1px `var(--border)` 细线 |

## 三、菜单项与路由

| 菜单项 | 路由 | MVP 行为 |
|---|---|---|
| 个人主页 | `/profile` | 占位（页面未建，点击后关闭菜单） |
| 发布管理 | `/my/publishes` | 占位（同上） |
| 账户安全 | `/account-security` | 占位（同上） |
| 帮助中心 | `/help` | **真实跳转**（页面已存在） |
| 退出登录 | `/login` | **mock 登出**（跳登录页，演示闭环） |

> 占位项在对应模块实现后把 `href` 换成真实路由即可，组件零改动。

## 四、代码骨架

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const MENU_ITEMS = [
  ["◇", "个人主页", "/profile"],
  ["⌘", "发布管理", "/my/publishes"],
  ["◈", "账户安全", "/account-security"],
  ["?", "帮助中心", "/help"],
] as const;

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>U</span><strong>我的账户</strong>
      </button>
      {open && (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-head"><span>U</span><div><strong>我的账户</strong><small>普通用户</small></div></div>
          {MENU_ITEMS.map(([icon, label, href]) => (
            <Link className="user-menu-item" href={href} key={label} role="menuitem">
              <span>{icon}</span>{label}
            </Link>
          ))}
          <div className="user-menu-divider" />
          <Link className="user-menu-item danger" href="/login" role="menuitem"><span>⏻</span>退出登录</Link>
        </div>
      )}
    </div>
  );
}
```

## 五、待确认 3 点

1. **头部用户卡**：下拉顶部加"头像 + 我的账户 + 普通用户"信息卡（行业标准）——加吗？
2. **占位项行为**：个人主页/发布管理/账户安全先占位（点击关闭菜单，页面做好后接路由）——OK？
3. **退出登录**：红色文字 + mock 跳 `/login`——OK？

## 六、落地记录（2026-08-20 已确认并完成）

- 新组件 `components/user-menu.tsx`（client）：点击触发、外点（document click + ref.contains）/ Esc / 选择后关闭；`aria-haspopup` / `aria-expanded` / `role="menu"`。
- `app-shell.tsx`：顶栏 `.topbar-user` 替换为 `<UserMenu />`。
- `app.css`：新增 `.user-menu` 系列（208px、右对齐、头部用户卡、hover 浅底、danger 红、150ms 淡入上移）；删除 `.topbar-user` 3 块。
- `globals.css`：新增语义色 `--error: #c0392b`（用到再加）。
- 验证：lint 0 错、build 通过。菜单项：帮助中心 → /help（真实），其余占位，退出登录 → /login（mock）。
