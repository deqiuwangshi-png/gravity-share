/**
 * 应用右栏（三页共用）：探索领域标签组 + 热门发现 + 品牌横幅
 */
import { ListColumn } from "@/components/list-column";
import { APP_CATEGORIES, hotItems } from "@/lib/data";

export function AppAside() {
  return (
    <aside className="app-aside">
      <section className="aside-section">
        <h3 className="aside-title">探索领域</h3>
        <div className="aside-cats">{APP_CATEGORIES.map(([icon, name]) => <a className="aside-cat" href="#" key={name}><span>{icon}</span>{name}</a>)}</div>
      </section>
      <ListColumn title="热门发现" description="最近被更多人关注" items={hotItems} />
      <section className="aside-note"><h3>引力不替代原平台</h3><p>作品在哪里发布、交易与交付，仍由原平台负责。引力只做展示、发现与连接。</p></section>
    </aside>
  );
}
