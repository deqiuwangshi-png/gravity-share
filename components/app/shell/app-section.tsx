/**
 * 区块容器：标题 + 描述 + 可选右侧动作链接
 * 使用于 /home 等业务页面的内容分区；action 不传则不渲染
 */
export function AppSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="app-section">
      <div className="app-section-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {action && <span className="section-action" data-placeholder>{action}</span>}
      </div>
      {children}
    </section>
  );
}
