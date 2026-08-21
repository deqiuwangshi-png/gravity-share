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
        <span className="section-action" data-placeholder>更多 →</span>
      </div>
      <div className="list-panel">
        {items.map((item, index) => (
          <div className="list-item" data-placeholder key={item}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{item}</strong>
              <small>{index === 0 ? "AI · 工具" : "开发 · 资源"}</small>
            </div>
            <b>→</b>
          </div>
        ))}
      </div>
    </div>
  );
}
