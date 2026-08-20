import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "用户协议 | 引力",
  description: "引力用户协议：使用引力平台需要遵守的条款与约定。",
};

export default function TermsPage() {
  return (
    <LegalLayout title="用户协议" updated="2026-08-20">
      <section className="legal-section">
        <h2>一、协议的接受与适用范围</h2>
        <p>欢迎使用引力。使用引力平台（包括网站及未来推出的相关服务），即表示你已阅读并同意本协议的全部条款。本协议适用于你在引力上的浏览、搜索、发布、收藏等全部行为。</p>
      </section>
      <section className="legal-section">
        <h2>二、账号与注册</h2>
        <p>注册时请提供真实、准确的信息，并妥善保管账号与密码。你应对账号下的全部行为负责。如发现账号被盗用或存在异常，请及时联系我们。</p>
      </section>
      <section className="legal-section">
        <h2>三、内容发布与规范</h2>
        <p>发布内容须为合法、真实、不侵犯他人权益的信息。禁止发布违法违规、侵权、虚假或含有恶意推广的内容。引力有权对违规内容进行下架或删除。</p>
      </section>
      <section className="legal-section">
        <h2>四、知识产权</h2>
        <p>你在引力发布的内容，其知识产权仍归你或原权利人所有。你授予引力在平台范围内展示、传播该内容的非独占许可。</p>
      </section>
      <section className="legal-section">
        <h2>五、平台责任边界</h2>
        <p>引力仅提供展示与连接服务，不参与交易担保。内容在哪里发布、交易与交付，仍由原平台负责。因内容本身产生的纠纷，由发布者与相关方自行解决。</p>
      </section>
      <section className="legal-section">
        <h2>六、免责声明</h2>
        <p>引力对平台内容的准确性、完整性不作保证。因使用本平台产生的直接或间接损失，在法律允许的范围内，引力不承担责任。</p>
      </section>
      <section className="legal-section">
        <h2>七、协议的变更与终止</h2>
        <p>我们可能适时更新本协议，更新后将在页面公示。若你不同意变更，可停止使用平台；继续使用即视为接受更新后的协议。</p>
      </section>
      <section className="legal-section">
        <h2>八、联系我们</h2>
        <p>如对本协议有任何疑问，欢迎通过帮助中心或站内反馈联系我们。</p>
      </section>
    </LegalLayout>
  );
}
