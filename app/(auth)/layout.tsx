import "@/styles/auth/decor.css";
import Link from "next/link";
import { Logo } from "@/components/common/logo";

/**
 * (auth) 认证双栏壳（2026-09-02 迁移：shell.css/card.css 布局 Tailwind 化）
 * 装饰锚点类名保留供 styles/auth/decor.css 选择器使用：
 * - auth-brand-panel：::before/::after 背景双圆环（需保持 relative + overflow-hidden）
 * - auth-orbit / orbit-*：纯装饰轨道图形
 * - auth-brand-logo：.logo-mark 白底场景覆盖
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-svh grid-cols-2 overflow-hidden bg-surface max-[820px]:block">
      <section
        className="auth-brand-panel relative flex min-h-svh flex-col overflow-hidden bg-primary px-[clamp(36px,6vw,88px)] pb-8 pt-[38px] text-on-primary max-[820px]:min-h-[390px] max-[820px]:px-6 max-[820px]:pb-7 max-[820px]:pt-6 max-[480px]:min-h-[350px]"
        aria-label="引力品牌介绍"
      >
        <Logo
          className="auth-brand-logo z-[1] inline-flex w-fit items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.5px]"
        />
        <div className="z-[1] my-auto max-w-[560px] py-[6vh] max-[820px]:mb-0 max-[820px]:mt-auto max-[820px]:pb-0 max-[820px]:pt-[45px]">
          <p className="mb-6 text-[13px] font-bold tracking-[0.04em] text-white/68">
            一个开放的发现与连接平台
          </p>
          <h1 className="m-0 text-[clamp(38px,3.8vw,58px)] leading-[1.1] tracking-[-3px] max-[820px]:text-[clamp(34px,9vw,48px)] max-[820px]:tracking-[-2px]">
            让好东西有地方摆，
            <br />
            <span className="text-accent">让有需求的人找得到。</span>
          </h1>
          <p className="mt-7 max-w-[430px] text-base leading-[1.8] text-white/70 max-[820px]:mt-[15px] max-[820px]:text-sm max-[480px]:max-w-[260px]">
            从今天开始，把你找到的和你创造的，放到更容易相遇的地方。
          </p>
          <div className="auth-orbit" aria-hidden="true">
            <span className="orbit-ring orbit-ring-large" />
            <span className="orbit-ring orbit-ring-small" />
            <span className="orbit-core" />
            <span className="orbit-node orbit-node-one" />
            <span className="orbit-node orbit-node-two" />
            <span className="orbit-node orbit-node-three" />
          </div>
        </div>
        <div className="z-[1] flex gap-[25px] text-xs text-white/52 max-[820px]:hidden">
          <span>发现价值</span>
          <span>连接彼此</span>
          <span>分享好东西</span>
        </div>
      </section>
      <section className="flex min-h-svh min-w-0 flex-col justify-center overflow-y-auto bg-background px-[clamp(32px,7vw,112px)] py-10 max-[820px]:min-h-0 max-[820px]:px-6 max-[820px]:pb-[34px] max-[820px]:pt-[72px]">
        {children}
        <p className="mx-auto mt-[22px] text-center text-xs text-muted">
          继续即表示你同意引力的 <Link href="/terms" className="font-semibold text-primary">用户协议</Link> 和{" "}
          <Link href="/privacy" className="font-semibold text-primary">隐私政策</Link>
        </p>
      </section>
    </main>
  );
}
