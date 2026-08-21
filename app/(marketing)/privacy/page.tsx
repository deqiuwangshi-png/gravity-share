import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = {
  title: "隐私政策 | 引力",
  description: "引力隐私政策：我们如何收集、使用与保护你的个人信息。",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="隐私政策" updated="2026-08-20">
      <section className="legal-section">
        <h2>一、我们收集的信息</h2>
        <p>为提供基础服务，我们收集两类信息：账号信息（昵称、邮箱、头像）与使用数据（浏览、搜索、收藏、发布记录）。</p>
      </section>
      <section className="legal-section">
        <h2>二、信息的使用</h2>
        <p>我们使用上述信息用于：提供服务与个性化推荐、改进产品体验、保障账号安全与处理反馈。</p>
      </section>
      <section className="legal-section">
        <h2>三、信息的共享与披露</h2>
        <p>我们不会出售你的个人信息。仅在法律要求、保护平台与用户权益等必要情形下，才可能依法披露。</p>
      </section>
      <section className="legal-section">
        <h2>四、信息的存储与安全</h2>
        <p>你的数据存储于境内服务器。我们采取合理的安全措施保护数据，但无法保证绝对安全，请你妥善保管账号。</p>
      </section>
      <section className="legal-section">
        <h2>五、你的权利</h2>
        <p>你有权访问、更正或删除你的个人信息，也可要求注销账号。相关请求可通过文末联系方式处理。</p>
      </section>
      <section className="legal-section">
        <h2>六、未成年人保护</h2>
        <p>引力面向成年用户。若你未满 18 周岁，请在监护人同意并陪同下使用本平台。</p>
      </section>
      <section className="legal-section">
        <h2>七、政策的更新</h2>
        <p>本政策可能随产品与法律要求更新，更新后将在页面公示并注明生效日期。</p>
      </section>
      <section className="legal-section">
        <h2>八、联系我们</h2>
        <p>如对个人信息处理有任何疑问，或需要行使你的权利，请通过帮助中心或站内反馈联系我们。</p>
      </section>
    </LegalLayout>
  );
}
