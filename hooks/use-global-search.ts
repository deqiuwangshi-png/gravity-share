/**
 * 全局搜索 hook（2026-09-04 自 app-shell 抽离——组件职责分层，见 AGENTS.md）
 * 承载：输入框受控值 + 回车/清除的路由导航 + URL ?q= 回显 + 「/」快捷键聚焦
 * 组件（components/app/shell/global-search.tsx）只保留 DOM 与受控绑定。
 *
 * 关于 ?q= 读取：保留 window.location.search 手写解析，未改用 Next useSearchParams——
 * 后者在 layout 级 client 组件中使用会触发 Next 的 Suspense 边界约束（需包 <Suspense>，
 * 否则静态预渲染路由报错），并把约束扩散到全部 (app) 路由；SquareFeed 页面内消费
 * useSearchParams（app/(app)/home/page.tsx 已用 Suspense 包裹）保持不变。
 */
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

/** 搜索落点路由（2026-08-27 方案A 广场合并进首页，?q= 由 SquareFeed 前端过滤） */
const SEARCH_TARGET = "/home";

export function useGlobalSearch() {
  const [search, setSearch] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  /** 回车搜索：跳 /home?q=…（零新依赖，SquareFeed 用 useSearchParams 过滤） */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = search.trim();
    router.push(q ? `${SEARCH_TARGET}?q=${encodeURIComponent(q)}` : SEARCH_TARGET);
  }

  /** 清除：清空输入并退回未过滤的首页 */
  function clear() {
    setSearch("");
    router.push(SEARCH_TARGET);
  }

  /* 搜索词回显（2026-08-31）：路由变化时把 URL ?q= 同步进输入框——从 /home?q=xx 进入或搜索后离开再回来，搜索态不丢失。
   * 实现：React 官方「render 期状态调整」模式（you-might-not-need-an-effect），替代 effect 内同步 setState——
   * 规避 react-hooks/set-state-in-effect 级联渲染告警；SSR 首帧无 window（typeof 防护），
   * pathname 未变化时不触发调整（prevPath 守卫，不会无限重渲染） */
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath && typeof window !== "undefined") {
    setPrevPath(pathname);
    setSearch(new URLSearchParams(window.location.search).get("q") ?? "");
  }

  /* 全局 / 快捷键（2026-08-31 兑现 kbd 提示）：焦点不在输入类元素时按 / → 聚焦搜索框（阻止浏览器找字默认行为） */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable)) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return { search, setSearch, inputRef, submit, clear };
}
