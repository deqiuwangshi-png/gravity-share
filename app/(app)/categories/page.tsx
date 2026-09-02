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

      <div className="category-grid">{SQUARE_CATEGORIES.map((name) => {
        const meta = SQUARE_CATEGORY_META[name];
        const count = posts.filter((post) => post.category === name).length;
        return (
          <Link className="category-card" href={`/categories/${meta.slug}`} key={name}>
            <span className="category-icon">{meta.icon}</span>
            <div>
              <strong>{name}</strong>
              <small>{meta.desc}</small>
              <em>{count} 个内容</em>
            </div>
            <span className="category-arrow" aria-hidden="true">→</span>
          </Link>
        );
      })}        </div>
      </div>
  </div>;
}
