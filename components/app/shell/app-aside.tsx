/**
 * 应用右栏（2026-08-23 内容池归一后接真实数据，async server 组件）：
 * 探索领域 = SQUARE_CATEGORIES 快捷入口（有内容的分类才显示，点击跳分类详情）
 * 最新发现 = square_posts 最新 3 条（替代原静态「热门发现」占位）
 * 024 广告位 = announcements kind=ad 第一条（厂商 Banner 侧栏卡，带「广告」标）
 * 注意：本组件读库；使用它的页面（home / categories / square）需 export const dynamic = "force-dynamic"
 */
import Link from "next/link";
import { ListColumn } from "./list-column";
import { SQUARE_CATEGORIES, SQUARE_CATEGORY_META } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { fetchSquarePosts, fetchAnnouncements } from "@/lib/queries";
import { safeHref } from "@/lib/links";

export async function AppAside() {
  const supabase = await createClient();
  const posts = await fetchSquarePosts(supabase);
  /* 探索领域：有内容的分类（无内容的分类不占位） */
  const catsWithContent = SQUARE_CATEGORIES.filter((name) => posts.some((post) => post.category === name));
  /* 024 广告位（厂商 Banner 侧栏卡）：announcements kind=ad 第一条（019 表已支持） */
  const ad = (await fetchAnnouncements(supabase)).find((a) => a.kind === "ad");

  /* 广告链接：站内路径 next/link；外链 safeHref 校验后新窗口（无 link 纯展示不可点） */
  const adHref = ad?.link
    ? ad.link.startsWith("/") && !ad.link.startsWith("//") && !ad.link.includes("\\")
      ? ad.link
      : safeHref(ad.link)
    : null;
  const adIsInternal = adHref !== null && adHref.startsWith("/");
  const adInner = ad ? (
    <>
      <span className="aside-ad-tag">广告</span>
      <b>{ad.title}</b>
      {ad.desc && <p>{ad.desc}</p>}
    </>
  ) : null;

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
      {ad && adHref && (
        <section className="aside-section aside-ad-wrap">
          {adIsInternal ? (
            <Link className="aside-ad" href={adHref}>{adInner}</Link>
          ) : (
            <a className="aside-ad" href={adHref} target="_blank" rel="noopener noreferrer">{adInner}</a>
          )}
        </section>
      )}
      {ad && !adHref && (
        <section className="aside-section aside-ad-wrap"><div className="aside-ad">{adInner}</div></section>
      )}
      <section className="aside-note"><h3>引力不替代原平台</h3><p>作品在哪里发布、交易与交付，仍由原平台负责。引力只做展示、发现与连接。</p></section>
    </aside>
  );
}
