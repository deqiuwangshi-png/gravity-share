/**
 * 轻量提示系统（2026-08-23）——统一替代浏览器原生 confirm 与局部悬浮提示
 * - show()：底部居中 toast，CSS 动画淡入淡出，2.2s 自动消失（tone: neutral / danger）
 * - 删除等危险操作不再弹窗二次确认，由各菜单内联确认（见 PostMenu/CommentMenu）
 * ToastProvider 挂载于 (app)/layout.tsx，应用区全部组件可用 useToast()
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
      <div className="toast-stack" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`toast-item ${item.tone}`}>{item.message}</div>
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
