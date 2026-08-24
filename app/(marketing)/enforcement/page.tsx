import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = {
  title: "举报与处罚细则 | 引力",
  description: "引力举报与处罚细则：举报途径、受理流程、处罚阶梯与申诉机制。",
};

export default function EnforcementPage() {
  return (
    <LegalLayout title="举报与处罚细则" updated="2026-08-24">
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
          <li><b>处置</b>：依据本细则第五条的阶梯采取相应措施；</li>
          <li><b>反馈</b>：对处置结果，可视情况通过站内通知反馈。</li>
        </ol>
        <p>恶意或滥用举报将不被支持，并可能构成违规。</p>
        <p>涉「违禁推广」（VPN、传销式返佣、赌博诈骗及灰产推广，详见第六条专项梯度）的举报将<b>优先核实、加急处置</b>。</p>
      </section>

      <section className="legal-section">
        <h2>四、内容审核</h2>
        <p>除用户举报外，平台对发布内容进行主动审核，审核依据为《用户协议》《引力社区规范》红线清单及法律法规：</p>
        <ul>
          <li><b>审核范围</b>：违法内容、侵权内容、违禁推广、恶意外链、冒名误导、垃圾与刷量等（对照红线清单逐项核查）；</li>
          <li><b>审核方式</b>：机器识别（限频、关键词、域名信誉库、异常行为检测）+ 人工复核，两者结合；</li>
          <li><b>审核结果</b>：通过（正常展示）、要求修改（限期整改）、下架 / 拦截（按第五条阶梯处置）；</li>
          <li><b>复核与申诉</b>：对审核结果有异议，可依第七条申诉机制提出。</li>
        </ul>
        <p>审核尺度对全体用户一致适用，不因身份、规模区别对待。</p>
      </section>

      <section className="legal-section">
        <h2>五、处罚阶梯（公开细则）</h2>
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
        <p>对黑灰产行为（批量注册、刷量、恶意推广、钓鱼等），可从重直接适用 ③-⑤；多次违规逐级加重。推广内容违规另有专项梯度，见第五条。</p>
      </section>

      <section className="legal-section">
        <h2>六、推广内容违规专项处罚</h2>
        <p>针对推广、返佣、付费链接等交易性内容的违规行为，在第五条通用阶梯基础上，按「违规类型 × 违规次数」适用以下专项梯度：</p>
        <table className="legal-table">
          <thead>
            <tr><th>违规类型</th><th>首次</th><th>第二次</th><th>三次及以上 / 情节严重</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><b>A 披露违规</b><br/>内容本身合规，但未标注返佣 / 付费 / 分佣 / 邀请奖励等交易关系</td>
              <td>① 提醒整改（限期 24 小时内补标「推广」）</td>
              <td>② 内容下架 + ③ 限流 7 天</td>
              <td>③ 限流 30 天 + ④ 封禁 30 天</td>
            </tr>
            <tr>
              <td><b>B 误导推广</b><br/>虚假收益承诺（如「躺赚」「稳赚」）、虚构数据、标题党式引流</td>
              <td>① 警告 + ② 删改违规表述</td>
              <td>② 内容下架 + ③ 限流 15 天</td>
              <td>③ 限流 30 天 + ④ 封禁 30 天；造成用户实际损失的，平台协助用户依法维权</td>
            </tr>
            <tr>
              <td><b>C 违禁推广</b><br/>未经许可的 VPN 等跨境网络接入服务推广 / 传销式返佣（拉人头、层级计酬、入门费）/ 赌博、诈骗、涉诈应用及灰产推广</td>
              <td>直接 ④ 永久封禁 + ⑤ 移交执法机关（不设首次宽限）</td>
              <td>—</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
        <p><b>加重情形</b>：批量发布、团伙协作、规避处置（换号 / 改域名重发）、对举报人骚扰报复。</p>
        <p><b>减轻情形</b>：首次且非故意、主动改正并消除影响、主动举报同类违规。</p>
      </section>

      <section className="legal-section">
        <h2>七、申诉机制</h2>
        <p>如你认为处置有误，可在收到处置通知后通过帮助与反馈（飞书表单）提交申诉，说明理由并提供证据。我们将在合理期限内复核并回复。申诉不影响依法配合执法机关的义务。</p>
      </section>

      <section className="legal-section">
        <h2>八、侵权投诉处理</h2>
        <p>如你发现平台内容侵犯了你的知识产权（著作权、商标权等）或人身权益（名誉权、肖像权、隐私权），可按以下流程投诉：</p>
        <ol>
          <li><b>投诉</b>：通过帮助与反馈（飞书表单）提交投诉，说明被侵权内容、权利归属及侵权事实，并附权利证明（如著作权登记、创作底稿、授权文件等）；</li>
          <li><b>核实</b>：我们核查投诉材料与内容是否属实；</li>
          <li><b>处置</b>：核实属实的，删除或断开涉嫌侵权内容；情况紧急的，先行采取必要措施；</li>
          <li><b>通知</b>：将处理结果告知投诉人，并视情况通知内容发布者；</li>
          <li><b>异议</b>：发布者对处置有异议的，可提交反通知说明，我们复核后决定是否恢复。</li>
        </ol>
        <p>恶意、虚假的侵权投诉将不被支持，并可能构成违规。</p>
      </section>

      <section className="legal-section">
        <h2>九、平台主动风控</h2>
        <p>除用户举报外，平台还会通过技术手段主动识别与处置违规行为：垃圾与刷量检测（发布/评论限频）、恶意域名拦截（域名信誉库）、异常账号识别等。主动风控处置同样适用本细则的申诉机制。</p>
      </section>

      <section className="legal-section">
        <h2>十、附则</h2>
        <p>本细则随《引力社区规范》一同修订并公示。相关文档：<Link href="/governance">治理规则总纲</Link> · <Link href="/guidelines">引力社区规范</Link> · <Link href="/terms">用户协议</Link> · <Link href="/disclaimer">免责声明</Link>。</p>
      </section>
    </LegalLayout>
  );
}
