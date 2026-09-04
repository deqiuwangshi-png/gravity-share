"use client";

import { Search, X } from "lucide-react";
import { useGlobalSearch } from "@/hooks/use-global-search";

/**
 * 顶栏全局搜索（2026-09-04 自 app-shell 拆出）
 * 纯受控展示：状态机与路由导航在 hooks/use-global-search，本组件只做 DOM 与绑定。
 * 装饰类名 global-search 由 styles/app/decor.css 承载聚焦光晕，勿删；
 * 断点 800（占满顶栏宽）/ 480（kbd 隐藏）逐像素保留。
 */
export function GlobalSearch() {
  const { search, setSearch, inputRef, submit, clear } = useGlobalSearch();

  return (
    <form
      className="global-search relative flex h-10 max-w-[620px] flex-1 items-center rounded-[10px] border border-line bg-surface transition-[border-color,box-shadow] duration-[180ms] focus-within:border-line-primary max-[800px]:w-full"
      onSubmit={submit}
    >
      <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-soft">
        <Search size={16} />
      </span>
      <input
        ref={inputRef}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="搜索你需要的东西……（回车搜索，/ 快捷聚焦）"
        aria-label="全局搜索"
        className="min-w-0 flex-1 border-0 bg-transparent pl-9 text-foreground outline-none placeholder:text-soft"
      />
      {search && (
        <button
          type="button"
          className="mr-1 grid size-5 cursor-pointer place-items-center rounded-full border-0 bg-hover text-muted transition-colors duration-[180ms] hover:text-foreground"
          aria-label="清除搜索"
          onClick={clear}
        >
          <X size={13} />
        </button>
      )}
      <kbd className="mr-[10px] border-0 bg-transparent p-0 text-[11px] text-muted max-[480px]:hidden">/</kbd>
    </form>
  );
}
