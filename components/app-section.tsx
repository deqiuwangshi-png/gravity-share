/**
 * 区块容器：标题 + 描述 + 右侧动作链接
 * 使用于 /home 等业务页面的内容分区
 */
export function AppSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <section className="app-section">
      <div className="app-section-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <a href="#">{action}</a>
      </div>
      {children}
    </section>
  );
}
