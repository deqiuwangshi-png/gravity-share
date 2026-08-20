import type { Metadata } from "next";
import { AppAside } from "@/components/app-aside";
import { categoryDetails } from "@/lib/data";

export const metadata: Metadata = {
  title: "全部分类 | 引力",
  description: "按方向浏览所有内容分类。",
};

export default function CategoriesPage() {
  return <div className="app-content app-layout">
    <div className="app-feed">
      <header className="feed-head">
        <h1>全部分类</h1>
        <p>按方向浏览所有内容分类</p>
      </header>

      <div className="category-grid">{categoryDetails.map((cat) => <a className="category-card" href="#" key={cat.name}>
        <span className="category-icon">{cat.icon}</span>
        <div>
          <strong>{cat.name}</strong>
          <small>{cat.count} 个内容</small>
        </div>
      </a>)}</div>
    </div>

    <AppAside />
  </div>;
}
