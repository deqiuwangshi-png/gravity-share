import "@/styles/auth/shell.css";
import "@/styles/auth/card.css";
import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="引力品牌介绍">
        <Link href="/" className="auth-brand-logo" aria-label="返回引力首页">
          <span className="logo-mark" aria-hidden="true"><span /></span>
          引力
        </Link>
        <div className="auth-brand-content">
          <p className="auth-brand-kicker">一个开放的发现与连接平台</p>
          <h1>让好东西有地方摆，<br /><span>让有需求的人找得到。</span></h1>
          <p className="auth-brand-description">从今天开始，把你找到的和你创造的，放到更容易相遇的地方。</p>
          <div className="auth-orbit" aria-hidden="true">
            <span className="orbit-ring orbit-ring-large" />
            <span className="orbit-ring orbit-ring-small" />
            <span className="orbit-core" />
            <span className="orbit-node orbit-node-one" />
            <span className="orbit-node orbit-node-two" />
            <span className="orbit-node orbit-node-three" />
          </div>
        </div>
        <div className="auth-brand-footer"><span>发现价值</span><span>连接彼此</span><span>分享好东西</span></div>
      </section>
      <section className="auth-form-panel">
        {children}
        <p className="auth-legal">继续即表示你同意引力的 <Link href="/terms">用户协议</Link> 和 <Link href="/privacy">隐私政策</Link></p>
      </section>
    </main>
  );
}
