import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = {
  title: "举报与处罚细则 | 引力",
  description: "引力举报与处罚细则：举报途径、受理流程、处罚阶梯与申诉机制。",
};

export default function EnforcementPage() {
  return (
    <LegalLayout title="举报与处罚细则" updated="2026-08-23">
      <section className="legal-section">
        <h2>一、总则</h2>
        <p>为落实《引力社区规范》，保障社区公开、公平、公正，本细则明确举报途径、受理流程与处罚阶梯。本细则对全体用户一致适用，处理结果有据可依、可申诉。</p>
      </section>

      <section className="legal-section">
        <h2>二、举报途径</h2>
        <ul>
          <li>帖子 / 评论：点击内容上的「举报」按钮（需登录）；</li>
          <li>帮助与反馈：通过飞书反馈表单提交情况说明。</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>三、受理与核实流程</h2>
        <ol>
          <li><b>受理</b>：举报提交后进入待处理队列；</li>
          <li><b>核实</b>：我们核查举报内容是否违反《用户协议》《引力社区规范》或法律法规；</li>
          <li><b>处置</b>：依据本细则第四条的阶梯采取相应措施；</li>
          <li><b>反馈</b>：对处置结果，可视情况通过站内通知反馈。</li>
        </ol>
        <p>恶意或滥用举报将不被支持，并可能构成违规。</p>
      </section>

      <section className="legal-section">
        <h2>四、处罚阶梯（公开细则）</h2>
        <p>根据违规行为的性质与情节，处罚从轻到重依次为：</p>
        <table className="legal-table">
          <thead>
            <tr><th>层级</th><th>措施</th><th>适用情形（示例）</th></tr>
          </thead>
          <tbody>
            <tr><td>① 提醒警告</td><td>站内通知提醒，要求限期整改</td><td>轻微违规、首次违规、非故意</td></tr>
            <tr><td>② 内容下架 / 外链封禁</td><td>删除或隐藏违规内容；外链置为「已移除」</td><td>违规内容、恶意链接</td></tr>
            <tr><td>③ 账号限流</td><td>限制发布、评论等部分功能一段时间</td><td>重复违规、刷屏、恶意推广</td></tr>
            <tr><td>④ 账号封禁</td><td>封禁账号（可含限期与永久）</td><td>严重违规、黑灰产、拒不改正</td></tr>
            <tr><td>⑤ 移交执法机关</td><td>依法报告并配合调查</td><td>涉嫌诈骗、赌博、涉毒等违法犯罪</td></tr>
          </tbody>
        </table>
        <p>对黑灰产行为（批量注册、刷量、恶意推广、钓鱼等），可从重直接适用 ③-⑤；多次违规逐级加重。</p>
      </section>

      <section className="legal-section">
        <h2>五、申诉机制</h2>
        <p>如你认为处置有误，可在收到处置通知后通过帮助与反馈（飞书表单）提交申诉，说明理由并提供证据。我们将在合理期限内复核并回复。申诉不影响依法配合执法机关的义务。</p>
      </section>

      <section className="legal-section">
        <h2>六、平台主动风控</h2>
        <p>除用户举报外，平台还会通过技术手段主动识别与处置违规行为：垃圾与刷量检测（发布/评论限频）、恶意域名拦截（域名信誉库）、异常账号识别等。主动风控处置同样适用本细则的申诉机制。</p>
      </section>

      <section className="legal-section">
        <h2>七、附则</h2>
        <p>本细则随《引力社区规范》一同修订并公示。相关文档：<Link href="/guidelines">引力社区规范</Link> · <Link href="/terms">用户协议</Link> · <Link href="/disclaimer">免责声明</Link>。</p>
      </section>
    </LegalLayout>
  );
}
