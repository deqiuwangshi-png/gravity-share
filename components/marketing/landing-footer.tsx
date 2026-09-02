import Link from "next/link";
import { Logo } from "@/components/common/logo";
import { SITE_INFO } from "@/lib/config";

/**
 * 落地页页脚（2026-09-02 P0 试点：自 (marketing)/page.tsx 内联 footer 拆出，样式由 site.css 迁 Tailwind 原子类）
 * 服务端静态组件：品牌区 + 服务/法律/社区三列 + 飞书社群二维码 + 版权行
 */
export function LandingFooter() {
  return (
    <footer className="container pt-16 pb-[30px] text-[13px] text-soft">
      <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-12 border-b border-line pb-[34px] max-[800px]:grid-cols-1 max-[800px]:gap-7">
        <div>
          <Logo className="inline-flex items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.5px]" />
          <p className="mt-[14px] text-[13px] text-muted">开放 · 连接 · 发现。</p>
        </div>
        <nav aria-label="站点链接">
          <h3 className="mb-[14px] text-[13px] font-semibold text-foreground">服务</h3>
          <Link href="/about" className="block py-[5px] text-[13px] text-muted transition-colors duration-[180ms] hover:text-primary">关于引力</Link>
          <Link href="/help" className="block py-[5px] text-[13px] text-muted transition-colors duration-[180ms] hover:text-primary">帮助中心</Link>
        </nav>
        <nav aria-label="法律链接">
          <h3 className="mb-[14px] text-[13px] font-semibold text-foreground">法律</h3>
          <Link href="/governance" className="block py-[5px] text-[13px] text-muted transition-colors duration-[180ms] hover:text-primary">治理规则总纲</Link>
          <Link href="/guidelines" className="block py-[5px] text-[13px] text-muted transition-colors duration-[180ms] hover:text-primary">引力社区规范</Link>
          <Link href="/enforcement" className="block py-[5px] text-[13px] text-muted transition-colors duration-[180ms] hover:text-primary">举报与处罚细则</Link>
          <Link href="/disclaimer" className="block py-[5px] text-[13px] text-muted transition-colors duration-[180ms] hover:text-primary">免责声明</Link>
          <Link href="/terms" className="block py-[5px] text-[13px] text-muted transition-colors duration-[180ms] hover:text-primary">用户协议</Link>
          <Link href="/privacy" className="block py-[5px] text-[13px] text-muted transition-colors duration-[180ms] hover:text-primary">隐私政策</Link>
        </nav>
        <nav aria-label="站点链接">
          <h3 className="mb-[14px] text-[13px] font-semibold text-foreground">社区</h3>
          <Link href="https://github.com/deqiuwangshi-png/gravity-share" className="block py-[5px] text-[13px] text-muted transition-colors duration-[180ms] hover:text-primary">引力开源（国际版）</Link>
          <Link href="https://gitee.com/earth-players/GSWL" className="block py-[5px] text-[13px] text-muted transition-colors duration-[180ms] hover:text-primary">引力开源（国内版）</Link>
          {/* 2026-08-31：飞书社群二维码（静态图 public/images/fileName.png，URL 不带 public 前缀；原先误放 app/images + public 前缀均无法访问） */}
          <div className="mt-1.5 inline-flex flex-col items-center gap-2 text-xs text-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- 运营二维码静态图 */}
            <img src="/images/fileName.png" alt="飞书社群二维码" width={110} height={110} loading="lazy" className="h-[110px] w-[110px] rounded-[10px] border border-line bg-white object-contain" />
            <span>扫码加入飞书社群</span>
          </div>
        </nav>
      </div>
      <div className="flex items-center justify-between gap-4 pt-[22px] text-xs text-soft">
        <span>{SITE_INFO.copyright}</span>
        <span>{SITE_INFO.icp}</span>
      </div>
    </footer>
  );
}
