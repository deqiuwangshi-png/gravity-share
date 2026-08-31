import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = {
  title: "帮助中心 | 引力",
  description: "引力帮助中心：入门、发布、账号与常见问题。",
};

export default function HelpPage() {
  return (
    <LegalLayout title="帮助中心">
      <section className="legal-section">
        <h2>入门</h2>
        <h3>如何开始使用引力？</h3>
        <p>注册账号后，即可搜索、浏览、收藏与发布内容。</p>
        <h3>搜索功能怎么用？</h3>
        <p>在搜索框输入关键词，或通过分类浏览你感兴趣的方向。</p>
      </section>
      <section className="legal-section">
        <h2>发布</h2>
        <h3>如何发布一个发现？</h3>
        <p>点击「发布」，选择内容类型，填写标题、介绍和链接即可。</p>
        <h3>发布有什么限制？</h3>
        <p>内容需合法、真实、不侵犯他人权益；商业推广需如实标注。</p>
      </section>
      <section className="legal-section">
        <h2>账号</h2>
        <h3>忘记密码怎么办？</h3>
        <p>通过注册邮箱找回或重置密码。</p>
        <h3>如何修改个人资料？</h3>
        <p>进入个人中心，可修改昵称、头像等信息。</p>
      </section>
      <section className="legal-section">
        <h2>常见问题</h2>
        <h3>引力和原平台是什么关系？</h3>
        <p>引力只做展示与连接。内容在哪里发布、交易与交付，仍由原平台负责。</p>
        <h3>有收费计划吗？</h3>
        <p>发现与分享永久免费。会员订阅即将开放，单次内容投放与展示位服务的开放时间会在首页定价区提前公示。</p>
        <h3>订阅计划为什么点进去是「即将开放」？</h3>
        <p>订阅需要完整的支付与结算能力支撑，我们选择在跑通之后再开放，避免过早承诺。开放前会在应用内「订阅计划」页提前公示方案与价格。</p>
      </section>
    </LegalLayout>
  );
}
