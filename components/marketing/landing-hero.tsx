import { Search } from "lucide-react";
import { MARKETING_SEARCH_HINTS } from "@/lib/data";

/**
 * 落地页 Hero 搜索区（2026-09-02 P0 试点：自 (marketing)/page.tsx 内联 hero 拆出，样式由 site.css 迁 Tailwind 原子类）
 * 服务端静态组件：品牌语 + 搜索框（readOnly 占位，检索功能未上线）
 */
export function LandingHero() {
  return (
    <section className="container pt-[88px] pb-[70px] text-center max-[800px]:pt-[60px]">
      <div className="mb-[25px] inline-flex items-center gap-[7px] rounded-full border border-line-primary bg-primary-subtle px-3 py-[7px] text-[13px] text-primary-dark">
        <span className="size-1.5 rounded-full bg-primary" />
        一个开放的发现与连接平台
      </div>
      <h1 className="mx-auto max-w-[850px] text-[clamp(46px,6vw,76px)] font-extrabold leading-[1.05] tracking-[-4px] max-[800px]:tracking-[-2px]">
        让好东西有地方摆，<br /><span className="text-primary">让有需求的人找得到。</span>
      </h1>
      <p className="mx-auto mb-[35px] mt-[27px] max-w-[650px] text-[18px] leading-[1.8] text-muted max-[800px]:text-base">
        好文章、好工具、好作品、好课程、好服务，不应该只存在于某一个平台。引力，让分散在互联网各处的价值被更多人发现。
      </p>
      <div
        className="mx-auto flex min-h-16 w-[min(720px,100%)] items-center rounded-2xl border border-line bg-surface p-2 shadow-card max-[800px]:items-stretch max-[520px]:flex-wrap max-[520px]:p-1.5"
        role="search"
      >
        <span className="w-[52px] text-soft max-[800px]:w-[38px]" aria-hidden="true"><Search size={22} /></span>
        <input
          name="q"
          type="search"
          className="min-w-0 flex-1 border-0 bg-transparent text-base text-foreground outline-none placeholder:text-soft max-[520px]:min-h-11"
          placeholder="你正在寻找什么？例如：AI工具、Python教程、3D模型……"
          aria-label="搜索资源"
          readOnly
        />
      </div>
      <div className="mt-[17px] text-[13px] text-soft max-[800px]:leading-[2.3]">
        大家正在找：
        {MARKETING_SEARCH_HINTS.map((hint) => (
          <span className="ml-[14px] max-[800px]:ml-[9px]" data-placeholder key={hint}>{hint}</span>
        ))}
      </div>
    </section>
  );
}
