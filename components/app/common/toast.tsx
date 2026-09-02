/**
 * 轻量提示系统（2026-08-23）——统一替代浏览器原生 confirm 与局部悬浮提示
 * - show()：底部居中 toast，CSS 动画淡入淡出，2.2s 自动消失（tone: neutral / danger）
 * - 删除等危险操作不再弹窗二次确认，由各菜单内联确认（见 PostMenu）
 * ToastProvider 挂载于 (app)/layout.tsx，应用区全部组件可用 useToast()
 * 2026-09-02：toast.css 全量 Tailwind 化（38 行 → 原子类）；toast-cycle keyframes 收 decor.css ⑨；
 *   danger 白字走新增 --on-error 令牌（text-on-error，语义收口）
 */
"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastItem = { id: number; message: string; tone: "neutral" | "danger" };

const ToastContext = createContext<{
  show: (message: string, tone?: "neutral" | "danger") => void;
} | null>(null);

const TOAST_DURATION = 2200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, tone: "neutral" | "danger" = "neutral") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, TOAST_DURATION);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-[26px] left-1/2 z-[120] grid max-w-[min(420px,calc(100vw-32px))] -translate-x-1/2 gap-2" aria-live="polite">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`animate-[toast-cycle_2.2s_ease_forwards] rounded-[10px] px-[18px] py-[10px] text-center text-[13px] leading-[1.5] shadow-panel ${
              item.tone === "danger" ? "bg-error text-on-error" : "bg-foreground text-surface"
            }`}
          >{item.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast 必须在 ToastProvider 内使用");
  return ctx;
}
