/**
 * 应用右栏（2026-08-23 内容池归一后接真实数据，async server 组件）：
 * 探索领域 = SQUARE_CATEGORIES 快捷入口（有内容的分类才显示，点击跳分类详情）
 * 最新发现 = square_posts 最新 3 条（替代原静态「热门发现」占位）
 * 注意：本组件读库；使用它的页面（home / categories / square）需 export const dynamic = "force-dynamic"
 */
import Link from "next/link";
import { ListColumn } from "./list-column";
import { SQUARE_CATEGORIES, SQUARE_CATEGORY_META } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { fetchSquarePosts } from "@/lib/queries";

export async function AppAside() {
  const supabase = await createClient();
  const posts = await fetchSquarePosts(supabase);
  /* 探索领域：有内容的分类（无内容的分类不占位） */
  const catsWithContent = SQUARE_CATEGORIES.filter((name) => posts.some((post) => post.category === name));

  return (
    <aside className="app-aside">
      <section className="aside-section">
        <h3 className="aside-title">探索领域</h3>
        <div className="aside-cats">
          {catsWithContent.map((name) => {
            const meta = SQUARE_CATEGORY_META[name];
            return (
              <Link className="aside-cat" href={`/categories/${meta.slug}`} key={name}>
                <span>{meta.icon}</span>{name}
              </Link>
            );
          })}
        </div>
      </section>
      <ListColumn
        title="最新发现"
        description="广场最新内容"
        items={posts.slice(0, 3).map((post) => ({
          id: post.id,
          title: post.content.length > 32 ? `${post.content.slice(0, 32)}…` : post.content,
          meta: `${post.authorName} · ${post.time}`,
        }))}
      />
      <section className="aside-note"><h3>引力不替代原平台</h3><p>作品在哪里发布、交易与交付，仍由原平台负责。引力只做展示、发现与连接。</p></section>
    </aside>
  );
}
