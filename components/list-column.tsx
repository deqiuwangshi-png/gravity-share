/**
 * 排名列表面板（如「热门发现」「最近新增」）
 */
export function ListColumn({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div>
      <div className="app-section-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <a href="#">更多 →</a>
      </div>
      <div className="list-panel">
        {items.map((item, index) => (
          <a className="list-item" href="#" key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{item}</strong>
              <small>{index === 0 ? "AI · 工具 · 2,381 次查看" : "开发 · 资源 · 1,927 次查看"}</small>
            </div>
            <b>→</b>
          </a>
        ))}
      </div>
    </div>
  );
}
