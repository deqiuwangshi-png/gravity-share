import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = {
  title: "免责声明 | 引力",
  description: "引力免责声明：平台责任边界与用户自主责任的说明。",
};

export default function DisclaimerPage() {
  return (
    <LegalLayout title="免责声明" updated="2026-08-23">
      <section className="legal-section">
        <h2>一、用户内容免责</h2>
        <p>平台上的帖子、评论、推荐等内容均由<b>用户自行发布</b>，其真实性、准确性、合法性由发布者负责，不代表平台的立场或观点。你在参考或使用他人内容前，请自行判断并独立决策，<b>对自己的行为和结果负责</b>。</p>
      </section>

      <section className="legal-section">
        <h2>二、外链内容免责</h2>
        <p>平台允许用户分享外部链接。当你离开引力访问外部网站时，会看到「即将离开引力」的提示——平台<b>不对外部网站的内容、安全与服务质量承担担保责任</b>。</p>
        <p>平台会通过域名信誉机制对高风险链接进行拦截提示，但无法保证覆盖所有恶意网站。请谨慎识别钓鱼、诈骗与恶意下载链接，因访问外部网站产生的损失由你自行承担。</p>
      </section>

      <section className="legal-section">
        <h2>三、交易与交付免责</h2>
        <p>引力仅提供信息展示与连接服务，不参与任何交易的担保、支付或交付。内容所涉的产品、服务、课程、活动等，其购买、交付、售后均由对应原平台负责。</p>
      </section>

      <section className="legal-section">
        <h2>四、服务可用性</h2>
        <p>我们将尽力保障平台稳定运行，但不对因不可抗力、网络故障、第三方服务中断、维护升级等原因导致的访问中断或数据损失承担赔偿责任（法律另有规定的除外）。</p>
      </section>

      <section className="legal-section">
        <h2>五、责任限制</h2>
        <p>在法律允许的最大范围内，因使用或无法使用平台而产生的直接或间接损失，引力不承担责任；平台的整体赔偿责任不超过你近十二个月实际支付给平台的费用（如有）。本声明不排除或限制依法不可排除的法定责任。</p>
      </section>

      <section className="legal-section">
        <h2>六、联系我们</h2>
        <p>如有疑问，欢迎通过帮助中心或站内反馈联系我们。相关文档：<Link href="/terms">用户协议</Link> · <Link href="/guidelines">引力社区规范</Link>。</p>
      </section>
    </LegalLayout>
  );
}
