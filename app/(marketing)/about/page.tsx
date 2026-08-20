import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "关于引力",
  description: "了解引力：我们为什么做这个平台，以及我们相信什么。",
};

export default function AboutPage() {
  return (
    <LegalLayout title="关于引力">
      <section className="legal-section">
        <h2>我们为什么做引力</h2>
        <p>互联网从来不缺好东西——好文章、好工具、好作品、好课程，它们各自待在各自的平台里，被孤岛和算法隔开。我们想让分散在各处的价值，能被更多人发现。</p>
      </section>
      <section className="legal-section">
        <h2>我们相信</h2>
        <p>真正有价值的内容，不应该被平台和算法隔开。发现与分享，是每个人与生俱来的权利。</p>
      </section>
      <section className="legal-section">
        <h2>引力的原则</h2>
        <p><strong>不替代原平台。</strong>作品在哪里发布、交易与交付，仍由原平台负责。</p>
        <p><strong>只做展示与连接。</strong>引力负责让好东西被看见、被找到。</p>
        <p><strong>开放与中立。</strong>分类与推荐对内容来源一视同仁。</p>
      </section>
      <section className="legal-section">
        <h2>联系我们</h2>
        <p>遇到问题，欢迎前往<a className="legal-link" href="/help">帮助中心</a>；或有任何想法，通过站内反馈告诉我们。</p>
      </section>
    </LegalLayout>
  );
}
