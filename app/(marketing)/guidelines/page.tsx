import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = {
  title: "引力社区规范 | 引力",
  description: "引力社区规范：每个用户对自己的行为和结果负责，共建公开、公平、公正的发现社区。",
};

export default function GuidelinesPage() {
  return (
    <LegalLayout title="引力社区规范" updated="2026-08-23">
      <section className="legal-section">
        <h2>一、我们的社区</h2>
        <p>引力是一个开放的发现与连接平台——好文章、好工具、好作品、好课程、好服务，让分散在互联网各处的价值，被更多人发现。</p>
        <p>我们相信：<b>每个用户对自己的行为和结果负责</b>。社区的健康，来自每一位成员对规则的尊重与执行。</p>
      </section>

      <section className="legal-section">
        <h2>二、我们的原则</h2>
        <ul>
          <li><b>公开</b>：规则公开透明，处理有据可依、有迹可查；</li>
          <li><b>公平</b>：规则对所有人一致适用，不因身份、规模而区别对待；</li>
          <li><b>公正</b>：惩处过罚相当，给予申诉与改正的机会；</li>
          <li><b>责任</b>：你的每个行为与结果，由你本人负责。</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>三、禁止行为（红线清单）</h2>
        <p>以下行为违反社区规范，将依据《举报与处罚细则》处理：</p>
        <ul>
          <li><b>违法内容</b>：发布违反法律法规的内容，包括但不限于诈骗、赌博、毒品、色情低俗、暴力恐怖、危害国家安全与社会稳定的内容；</li>
          <li><b>侵权内容</b>：抄袭、盗版、未经授权转载，或侵犯他人知识产权、名誉权、隐私权的行为；</li>
          <li><b>黑灰产行为</b>：批量注册与养号、刷量刷榜、恶意推广、薅羊毛、绕过平台风控机制、从事网络黑产与灰产交易；</li>
          <li><b>恶意外链</b>：发布钓鱼、诈骗、恶意软件下载、仿冒登录等恶意链接，或利用外链诱导用户上当；</li>
          <li><b>冒名与误导</b>：仿冒官方账号、冒充他人身份，发布虚假信息、标题党、误导性内容；</li>
          <li><b>骚扰与攻击</b>：辱骂、人身攻击、泄露他人隐私、恶意刷屏、滥用举报；</li>
          <li><b>规避处置</b>：以任何方式规避平台处罚（换号、改域名再次发布违规内容等）。</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>四、对黑灰产的零容忍</h2>
        <p>引力对黑灰产行为<b>零容忍</b>：一经发现，将直接采取最严厉的处置措施（封禁账号、屏蔽内容），并依法向有关部门报告。我们将持续升级风控手段（异常检测、限频、域名信誉库、举报联动等），保护社区成员的正当权益。</p>
      </section>

      <section className="legal-section">
        <h2>五、鼓励的行为</h2>
        <ul>
          <li>分享真实、优质、有来源的信息，注明出处与来源；</li>
          <li>诚实标注商业推广、联盟链接与利益关系；</li>
          <li>友善讨论、理性表达，尊重不同观点；</li>
          <li>发现违规内容，通过「举报」功能告诉我们。</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>六、规范的执行</h2>
        <p>本规范与《用户协议》《举报与处罚细则》共同构成引力社区的治理体系。处理将遵循公开、公平、公正原则，并给予申诉机会。我们保留适时修订本规范的权利，修订后将在页面公示。</p>
        <p>相关文档：<Link href="/terms">用户协议</Link> · <Link href="/enforcement">举报与处罚细则</Link> · <Link href="/privacy">隐私政策</Link>。</p>
      </section>
    </LegalLayout>
  );
}
