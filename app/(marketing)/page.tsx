import Link from "next/link";
import { LandingHeader } from "@/components/marketing/landing-header";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { LANDING_CARDS, MARKETING_CATEGORIES } from "@/lib/data";

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

/* section-head 左标题组（h2+p）：page 内 6 处复用同构，按 P0 方案就地类化不抽组件 */
function SectionHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="text-[30px] tracking-[-1px] max-[520px]:text-[26px]">{title}</h2>
      <p className="mt-[9px] text-sm text-muted">{desc}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip">
      <LandingHeader />

      <main>
        <LandingHero />

        <section className="container py-[75px]" id="problem">
          <div className="mb-7 flex items-end justify-between gap-5 max-[800px]:items-start">
            <SectionHead title="好东西很多，但都散落在各自的角落。" desc="好文章、好工具、好作品、好课程，各自待在各自的平台里，被孤岛隔开。你常常记得“有这么个好东西”，却想不起在哪里见过。" />
          </div>
          <div className="grid grid-cols-3 gap-[18px] max-[800px]:grid-cols-1">
            {problems.map(([tag, desc]) => (
              <article className="rounded-card border border-line bg-surface px-6 py-[26px]" key={tag}>
                <span className="mb-4 inline-block rounded-md bg-primary-soft px-[9px] py-[5px] text-xs font-semibold text-primary">{tag}</span>
                <p className="text-sm leading-[1.7] text-muted">{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container py-[75px]" id="who">
          <div className="grid grid-cols-2 gap-5 max-[800px]:grid-cols-1">
            <div className="min-h-[300px] rounded-section bg-primary-soft p-[42px] max-[800px]:min-h-0 max-[800px]:p-[30px]">
              <div className="mb-5 text-[13px] font-bold text-primary">如果你正在寻找</div>
              <h2 className="mb-[15px] text-[30px] tracking-[-1px]">不用再到处找。</h2>
              <p className="max-w-[430px] leading-[1.8] text-muted">不需要打开十几个平台。从一个地方开始发现互联网中真正值得关注的东西。</p>
              <div className="mt-[25px] flex flex-wrap gap-2">
                {["工具", "教程", "课程", "作品", "服务", "资源", "活动"].map((item) => (
                  <span key={item} className="rounded-lg bg-white/75 px-3 py-2 text-[13px]">{item}</span>
                ))}
              </div>
            </div>
            <div className="min-h-[300px] rounded-section border border-line bg-surface p-[42px] max-[800px]:min-h-0 max-[800px]:p-[30px]">
              <div className="mb-5 text-[13px] font-bold text-primary">如果你有好东西</div>
              <h2 className="mb-[15px] text-[30px] tracking-[-1px]">让它被更多人看见。</h2>
              <p className="max-w-[430px] leading-[1.8] text-muted">一个链接，一段介绍。把你做过的、发现的、正在使用的分享出来。</p>
              <Link className="mt-7 inline-block text-sm font-semibold whitespace-nowrap text-primary transition-colors duration-[180ms] hover:text-primary-dark" href="/register">
                发布一个发现 <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="container pt-5 pb-[75px]" id="categories" aria-label="资源分类">
          <div className="flex flex-wrap justify-center gap-2.5">
            {MARKETING_CATEGORIES.map((category) => (
              <span
                className="rounded-full border border-line bg-surface px-[17px] py-2.5 text-sm text-muted transition-[border-color,color,transform] duration-[180ms] hover:-translate-y-px hover:border-primary hover:text-primary"
                data-placeholder
                key={category}
              >
                {category}
              </span>
            ))}
          </div>
        </section>

        <section className="container py-[75px]" id="discover">
          <div className="mb-7 flex items-end justify-between gap-5 max-[800px]:items-start">
            <SectionHead title="正在被发现" desc="来自互联网不同角落的好东西" />
          </div>
          <div className="grid grid-cols-3 gap-[18px] max-[800px]:grid-cols-1">
            {LANDING_CARDS.map((card) => (
              <Link
                className="flex flex-col rounded-card border border-line bg-surface p-6 transition-[transform,box-shadow] duration-[220ms] hover:-translate-y-[3px] hover:shadow-card"
                href={card.link}
                key={card.title}
              >
                <div className="mb-[22px] flex items-center justify-between">
                  <span className="rounded-[7px] bg-primary-soft px-[9px] py-1.5 text-xs text-primary">{card.type}</span>
                </div>
                <h3 className="mb-2.5 truncate text-[19px] tracking-[-0.3px]">{card.title}</h3>
                <p className="mb-[22px] line-clamp-2 min-h-12 text-sm leading-[1.7] text-muted">{card.summary}</p>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4 text-xs text-soft">
                  <span>来自：{card.source}</span>
                  <span className="whitespace-nowrap font-semibold text-primary">查看 <span aria-hidden="true">→</span></span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="container py-[75px]" id="how">
          <div className="mb-7 flex items-end justify-between gap-5 max-[800px]:items-start">
            <SectionHead title="三步，让好东西相遇。" desc="从发现到分享，整个过程只需要三步。" />
          </div>
          <div className="grid grid-cols-3 gap-[18px] max-[800px]:grid-cols-1">
            {steps.map(([title, desc], index) => (
              <article className="rounded-card border border-line bg-surface px-6 py-[26px]" key={title}>
                <span className="mb-4 block text-[22px] font-extrabold tracking-[1px] text-primary">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mb-2.5 text-[18px]">{title}</h3>
                <p className="text-sm leading-[1.7] text-muted">{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container py-[75px]" id="pricing">
          {/* 定价（2026-08-31：订阅/投流已下线 → 三卡移除，改为免费口径文案；
              未来付费能力上线前会提前公告并公示方案与价格） */}
          <div className="mb-7 flex items-end justify-between gap-5 max-[800px]:items-start">
            <SectionHead title="目前完全免费，先放心用。" desc="本网站目前免费；未来如需付费功能（如展示位、会员），会提前公告并公示方案与价格。" />
            <Link className="text-sm text-primary transition-colors duration-[180ms] hover:text-primary-dark" href="/register">加入引力 <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section className="container border-t border-line py-[105px] text-center" id="about">
          <p className="mb-[18px] text-[13px] font-bold text-primary">引力的原则</p>
          <h2 className="mx-auto mb-5 max-w-[800px] text-[clamp(34px,4vw,52px)] leading-[1.15] tracking-[-2px]">互联网不缺好东西，缺的是让它们相遇的地方。</h2>
          <p className="mx-auto max-w-[620px] leading-[1.8] text-muted">我们相信，真正有价值的内容不应该被平台和算法隔开。引力把发现和分享连接在一起，让每一个好东西都有机会抵达真正需要它的人。</p>
        </section>

        <section className="container py-[75px]" id="help">
          <div className="mb-7 flex items-end justify-between gap-5 max-[800px]:items-start">
            <SectionHead title="常见问题" desc="还有什么想了解的？" />
          </div>
          <div className="grid grid-cols-3 gap-[18px] max-[800px]:grid-cols-1">
            <div className="rounded-card border border-line bg-surface px-6 py-5">
              <h3 className="mb-2 text-[15px]">引力和原平台是什么关系？</h3>
              <p className="text-sm leading-[1.7] text-muted">引力只做展示与连接。内容在哪里发布、交易与交付，仍由原平台负责。</p>
            </div>
            <div className="rounded-card border border-line bg-surface px-6 py-5">
              <h3 className="mb-2 text-[15px]">发布需要什么条件？</h3>
              <p className="text-sm leading-[1.7] text-muted">注册后即可发布，提供一条链接和一段介绍就够了。</p>
            </div>
            <div className="rounded-card border border-line bg-surface px-6 py-5">
              <h3 className="mb-2 text-[15px]">有收费计划吗？</h3>
              <p className="text-sm leading-[1.7] text-muted">目前完全免费。未来如需付费功能（如展示位、会员），会提前公告并公示方案与价格。</p>
            </div>
          </div>
        </section>

        <section className="container rounded-[28px] bg-primary px-10 py-[65px] text-center text-surface max-[520px]:px-6 max-[520px]:py-12">
          <h2 className="mb-[15px] text-[38px] tracking-[-1px] max-[520px]:text-[32px]">从一个发现开始。</h2>
          <p className="mb-7 text-white/72">加入引力，让你找到的和你创造的都更容易被看见。</p>
          <Link
            className="inline-block cursor-pointer rounded-control bg-surface px-[23px] py-[13px] text-sm text-primary-dark transition-[background,transform] duration-[180ms] hover:-translate-y-px"
            href="/register"
          >
            加入引力
          </Link>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
