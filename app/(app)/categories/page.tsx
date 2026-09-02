import Link from "next/link";
import type { Metadata } from "next";
import { SQUARE_CATEGORIES, SQUARE_CATEGORY_META } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { fetchSquarePosts } from "@/lib/queries-posts";

export const metadata: Metadata = {
  title: "全部分类 | 引力",
  description: "按方向浏览所有内容分类。",
};

/** 2b：分类计数读库；动态渲染 */
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const posts = await fetchSquarePosts(supabase);

  return <div className="app-content">
    <div className="min-w-0">
      <header className="mb-4 flex flex-wrap items-baseline gap-x-3">
        <h1 className="m-0 text-2xl tracking-[-0.5px]">全部分类</h1>
        <p className="m-0 text-[13px] text-muted">按方向浏览所有内容分类</p>
      </header>

      {/* 3 列大卡片（≤900 收 2 列、≤480 收 1 列，原 feed.css 断点逐字保留） */}
      <div className="grid grid-cols-3 gap-[14px] max-[900px]:grid-cols-2 max-[480px]:grid-cols-1">
        {SQUARE_CATEGORIES.map((name) => {
          const meta = SQUARE_CATEGORY_META[name];
          const count = posts.filter((post) => post.category === name).length;
          return (
            <Link
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-[22px_18px] transition-[border-color,background-color] duration-[180ms] hover:border-line-primary hover:bg-primary-subtle"
              href={`/categories/${meta.slug}`}
              key={name}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-[18px] text-primary">{meta.icon}</span>
              <span className="min-w-0 flex-1">
                <strong className="block text-[15px]">{name}</strong>
                <small className="mt-[3px] block text-[12px] text-soft">{meta.desc}</small>
                <em className="mt-[6px] block text-[12px] not-italic text-muted">{count} 个内容</em>
              </span>
              <span className="ml-auto shrink-0 text-[16px] text-soft group-hover:text-primary" aria-hidden="true">→</span>
            </Link>
          );
        })}
      </div>
      </div>
  </div>;
}
