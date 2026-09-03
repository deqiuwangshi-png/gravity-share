import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = {
  title: "引力平台治理规则总纲 | 引力",
  description: "引力平台治理规则总纲：治理体系总览、十项治理规则索引、原则与承诺。",
};

/**
 * 引力平台治理规则总纲（/governance，2026-08-24）
 * 定位：治理体系的「入口地图」——规则正文单一事实来源在各自文档，
 * 本页只做总览与索引，不重复规则内容（遵循治理纪律：不重复、单一事实来源）。
 */
export default function GovernancePage() {
  return (
    <LegalLayout title="引力平台治理规则总纲" updated="2026-08-24">
      <section className="legal-section">
        <h2>一、什么是治理总纲</h2>
        <p>引力的全部规则，按「<b>基础契约 · 社区规范 · 执行细则</b>」三层组织：基础契约管<b>法律责任</b>，社区规范管<b>社区行为</b>，执行细则管<b>落地执行</b>。本页是全部规则的入口地图——每项治理规则管什么、在哪看，一页说清。详细条款以各文档为准。</p>
      </section>

      <section className="legal-section">
        <h2>二、治理体系总览</h2>
        <table className="legal-table">
          <thead>
            <tr><th>层</th><th>文档</th><th>管什么</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>基础契约<br/>（法律责任）</td>
              <td><Link className="legal-link" href="/terms">用户协议</Link><br/>
                  <Link className="legal-link" href="/privacy">隐私政策</Link><br/>
                  <Link className="legal-link" href="/disclaimer">免责声明</Link></td>
              <td>账号责任与内容权责、推广披露义务、知识产权与法律适用；个人信息收集与保护；平台责任边界与外链免责</td>
            </tr>
            <tr>
              <td>社区规范<br/>（社区行为）</td>
              <td><Link className="legal-link" href="/guidelines">引力社区规范</Link></td>
              <td>价值观（公开公平公正、开放中立克制）、红线清单、评论与互动规范、推广与交易披露、引力不适合谁</td>
            </tr>
            <tr>
              <td>执行细则<br/>（落地执行）</td>
              <td><Link className="legal-link" href="/enforcement">举报与处罚细则</Link></td>
              <td>举报途径、受理核实、内容审核、处罚阶梯、推广专项处罚、申诉机制、侵权投诉处理、主动风控</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="legal-section">
        <h2>三、十项治理规则索引</h2>
        <table className="legal-table">
          <thead>
            <tr><th>规则</th><th>管什么</th><th>详细条款</th></tr>
          </thead>
          <tbody>
            <tr><td><b>① 用户规则</b></td><td>注册、账号安全、账号责任自负、内容发布与规范</td><td><Link className="legal-link" href="/terms">用户协议</Link></td></tr>
            <tr><td><b>② 审核规则</b></td><td>内容审核的范围、方式（机器 + 人工）与处置衔接</td><td><Link className="legal-link" href="/enforcement">细则 · 四</Link></td></tr>
            <tr><td><b>③ 广告规则</b></td><td>推广披露义务、违禁推广禁止、推广违规专项处罚</td><td><Link className="legal-link" href="/guidelines">规范 · 六</Link> · <Link className="legal-link" href="/enforcement">细则 · 六</Link></td></tr>
            <tr><td><b>④ 推荐规则</b></td><td>推荐机制说明、推荐位中立（不卖不换不内定）、算法权重公开</td><td><Link className="legal-link" href="/guidelines">规范 · 二</Link></td></tr>
            <tr><td><b>⑤ 评论规则</b></td><td>评论与互动行为规范、禁刷屏引战骚扰</td><td><Link className="legal-link" href="/guidelines">规范 · 四</Link></td></tr>
            <tr><td><b>⑥ 举报规则</b></td><td>举报途径、受理与核实流程、滥用举报的后果</td><td><Link className="legal-link" href="/enforcement">细则 · 二、三</Link></td></tr>
            <tr><td><b>⑦ 侵权处理</b></td><td>侵权投诉处理流程（权利人投诉 → 核实 → 删除/断开 → 通知 → 申诉）</td><td><Link className="legal-link" href="/enforcement">细则 · 八</Link></td></tr>
            <tr><td><b>⑧ 账户处罚</b></td><td>处罚阶梯（提醒 → 下架 → 限流 → 封禁 → 移交执法）</td><td><Link className="legal-link" href="/enforcement">细则 · 五</Link></td></tr>
            <tr><td><b>⑨ 申诉机制</b></td><td>申诉渠道、期限与复核</td><td><Link className="legal-link" href="/enforcement">细则 · 七</Link></td></tr>
            <tr><td><b>⑩ 数据与隐私</b></td><td>个人信息收集、使用、共享、你的权利、未成年人保护</td><td><Link className="legal-link" href="/privacy">隐私政策</Link></td></tr>
          </tbody>
        </table>
      </section>

      <section className="legal-section">
        <h2>四、原则与承诺</h2>
        <ul>
          <li><b>开放 · 中立 · 克制</b>：规则与算法权重公开、推荐位不卖不换不内定、不做裂变与焦虑营销（<Link className="legal-link" href="/guidelines">规范 · 二</Link>）；</li>
          <li><b>明辨</b>：推广内容如实标注，让每一次点击都清清楚楚（<Link className="legal-link" href="/guidelines">规范 · 六</Link>）；</li>
          <li><b>责任自负</b>：每个用户对自己的行为和结果负责（<Link className="legal-link" href="/terms">用户协议</Link>）；</li>
          <li><b>黑灰产零容忍</b>：一经发现直接最严处置并依法移交（<Link className="legal-link" href="/guidelines">规范 · 五</Link>）。</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>五、反馈与帮助</h2>
        <p>遇到违规内容，可通过帖子 / 评论的「举报」按钮或反馈表单告诉我们；对处置结果有异议，可通过申诉机制提出（<Link className="legal-link" href="/enforcement">细则 · 七</Link>）。更多使用问题见<Link className="legal-link" href="/#faq">官网常见问题</Link>。</p>
      </section>
    </LegalLayout>
  );
}
