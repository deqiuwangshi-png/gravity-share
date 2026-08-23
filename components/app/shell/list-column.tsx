/**
 * 右栏列表面板（「最新发现」等，2026-08-23 内容池归一后接真实数据）
 * items 为可点击条目（整项跳 /square/[id]），不再使用静态占位
 */
import Link from "next/link";

export type ListColumnItem = { id: string; title: string; meta: string };

export function ListColumn({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: ListColumnItem[];
}) {
  return (
    <div>
      <div className="app-section-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="list-panel">
        {items.map((item, index) => (
          <Link className="list-item" href={`/square/${item.id}`} key={item.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.meta}</small>
            </div>
            <b>→</b>
          </Link>
        ))}
      </div>
    </div>
  );
}
