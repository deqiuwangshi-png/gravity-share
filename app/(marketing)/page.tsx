import Link from "next/link";
import { Logo } from "@/components/common/logo";
import { ICONS } from "@/lib/icons";
import { SITE_INFO } from "@/lib/config";
import { LANDING_CARDS, MARKETING_CATEGORIES, MARKETING_SEARCH_HINTS } from "@/lib/data";

const problems = [
  ["平台割裂", "内容分散在几十个平台，每个都要单独逛一遍"],
  ["发现靠运气", "搜索靠猜、推荐靠算法，好东西经常擦肩而过"],
  ["被埋没", "好作品没人看见，发布完就沉底"],
];

const steps = [
  ["发现", "搜索、浏览分类，找到你感兴趣的东西"],
  ["了解", "查看详情，去原平台获取完整内容"],
  ["分享", "把你发现的好东西发布出来，让更多人看见"],
];

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <nav className="container nav" aria-label="主导航">
          <Logo className="logo" />
          <div className="nav-links">
            <Link href="/">首页</Link>
            <Link href="#pricing">定价</Link>
            <Link href="/about">关于</Link>
            <Link href="/help">帮助</Link>
          </div>
          <div className="nav-actions">
            <Link href="/login" className="btn btn-primary">登录</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero container">
          <div className="eyebrow"><span className="eyebrow-dot" />一个开放的发现与连接平台</div>
          <h1>让好东西有地方摆，<br /><span>让有需求的人找得到。</span></h1>
          <p className="hero-desc">好文章、好工具、好作品、好课程、好服务，不应该只存在于某一个平台。引力，让分散在互联网各处的价值被更多人发现。</p>
          <div className="search-box" role="search">
            <span className="search-icon" aria-hidden="true">{ICONS.search}</span>
            <input name="q" type="search" placeholder="你正在寻找什么？例如：AI工具、Python教程、3D模型……" aria-label="搜索资源" readOnly />
            <button className="search-button" type="button">开始发现</button>
          </div>
          <div className="search-hints">大家正在找：{MARKETING_SEARCH_HINTS.map((hint) => <span className="search-hint" data-placeholder key={hint}>{hint}</span>)}</div>
        </section>

        <section className="section container" id="problem">
          <div className="section-head">
            <div><h2 className="section-title">好东西很多，但都散落在各自的角落。</h2><p className="section-desc">好文章、好工具、好作品、好课程，各自待在各自的平台里，被孤岛隔开。你常常记得“有这么个好东西”，却想不起在哪里见过。</p></div>
          </div>
          <div className="problem-grid">{problems.map(([tag, desc]) => <article className="problem-card" key={tag}>
            <span className="problem-tag">{tag}</span>
            <p>{desc}</p>
          </article>)}</div>
        </section>

        <section className="section container" id="who">
          <div className="two-side">
            <div className="side-card find"><div className="side-label">如果你正在寻找</div><h2>不用再到处找。</h2><p>不需要打开十几个平台。从一个地方开始发现互联网中真正值得关注的东西。</p><div className="side-list">{["工具", "教程", "课程", "作品", "服务", "资源", "活动"].map((item) => <span key={item}>{item}</span>)}</div></div>
            <div className="side-card share"><div className="side-label">如果你有好东西</div><h2>让它被更多人看见。</h2><p>一个链接，一段介绍。把你做过的、发现的、正在使用的分享出来。</p><span className="side-action" data-placeholder>发布一个发现 <span aria-hidden="true">→</span></span></div>
          </div>
        </section>

        <section className="categories container" id="categories" aria-label="资源分类">
          <div className="category-list">{MARKETING_CATEGORIES.map((category) => <span className="category" data-placeholder key={category}>{category}</span>)}</div>
        </section>

        <section className="section container" id="discover">
          <div className="section-head">
            <div><h2 className="section-title">正在被发现</h2><p className="section-desc">来自互联网不同角落的好东西</p></div>
            <span className="more" data-placeholder>查看更多 <span aria-hidden="true">→</span></span>
          </div>
          <div className="cards">{LANDING_CARDS.map((card) => (
            <article className="card" key={card.title}>
              <div className="card-top"><span className="type">{card.type}</span><button className="save" type="button" aria-label={`收藏${card.title}`}>{ICONS.save}</button></div>
              <h3>{card.title}</h3><p>{card.summary}</p>
              <div className="card-meta"><span>推荐自：{card.source}</span><span className="card-link" data-placeholder>查看 <span aria-hidden="true">→</span></span></div>
            </article>
          ))}</div>
        </section>

        <section className="section container" id="how">
          <div className="section-head">
            <div><h2 className="section-title">三步，让好东西相遇。</h2><p className="section-desc">从发现到分享，整个过程只需要三步。</p></div>
          </div>
          <div className="steps">{steps.map(([title, desc], index) => <article className="step" key={title}>
            <span className="step-num">{String(index + 1).padStart(2, "0")}</span>
            <h3>{title}</h3>
            <p>{desc}</p>
          </article>)}</div>
        </section>

        <section className="section container" id="pricing">
          <div className="section-head">
            <div><h2 className="section-title">现在免费。</h2><p className="section-desc">引力本身不收费：发现与分享完全开放，未来的增值服务会提前公示。</p></div>
            <Link className="more" href="/register">加入引力 <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section className="principle container" id="about"><p className="principle-kicker">引力的原则</p><h2>互联网不缺好东西，缺的是让它们相遇的地方。</h2><p>我们相信，真正有价值的内容不应该被平台和算法隔开。引力把发现和分享连接在一起，让每一个好东西都有机会抵达真正需要它的人。</p></section>

        <section className="section container" id="help">
          <div className="section-head"><div><h2 className="section-title">常见问题</h2><p className="section-desc">还有什么想了解的？</p></div></div>
          <div className="faq-list">
            <div className="faq-item"><h3>引力和原平台是什么关系？</h3><p>引力只做展示与连接。内容在哪里发布、交易与交付，仍由原平台负责。</p></div>
            <div className="faq-item"><h3>发布需要什么条件？</h3><p>注册后即可发布，提供一条链接和一段介绍就够了。</p></div>
            <div className="faq-item"><h3>有收费计划吗？</h3><p>当前完全免费。如果未来推出增值服务，会提前公示。</p></div>
          </div>
        </section>

        <section className="container cta"><h2>从一个发现开始。</h2><p>加入引力，让你找到的和你创造的都更容易被看见。</p><Link className="btn" href="/register">加入引力</Link></section>
      </main>

      <footer className="container footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo className="logo" />
            <p>开放 · 连接 · 发现。</p>
          </div>
          <nav className="footer-col" aria-label="站点链接">
            <h3>服务</h3>
            <Link href="/about">关于引力</Link>
            <Link href="/help">帮助中心</Link>
          </nav>
          <nav className="footer-col" aria-label="法律链接">
            <h3>法律</h3>
            <Link href="/guidelines">引力社区规范</Link>
            <Link href="/enforcement">举报与处罚细则</Link>
            <Link href="/disclaimer">免责声明</Link>
            <Link href="/terms">用户协议</Link>
            <Link href="/privacy">隐私政策</Link>
          </nav>
          <nav className="footer-col" aria-label="站点链接">
            <h3>社区</h3>
            <Link href="https://github.com/deqiuwangshi-png/gravity-share">引力开源（国际版）</Link>
            <Link href="https://gitee.com/earth-players/GSWL">引力开源（国内版）</Link>
            <Link href="/terms">关注社群</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>{SITE_INFO.copyright}</span>
          <span>{SITE_INFO.icp}</span>
        </div>
      </footer>
    </div>
  );
}
