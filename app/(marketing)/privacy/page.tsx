import type { Metadata } from "next";
import { LegalLayout } from "@/components/marketing/legal-layout";

export const metadata: Metadata = {
  title: "隐私政策 | 引力",
  description: "引力隐私政策：我们如何收集、使用与保护你的个人信息。",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="隐私政策" updated="2026-08-23">
      <section className="legal-section">
        <h2>一、我们收集的信息</h2>
        <p>为向你提供基础服务，我们收集以下信息（均为提供服务所必需，遵循「最小必要」原则）：</p>
        <ul>
          <li><b>账号信息</b>：昵称、邮箱、头像、个人简介——注册与展示身份所需；</li>
          <li><b>内容信息</b>：你发布的帖子、评论、外链、标签——提供发布与发现服务；</li>
          <li><b>互动信息</b>：点赞、关注、浏览记录、认证申请——展示与推荐所需；</li>
          <li><b>安全信息</b>：登录设备、异常行为数据——账号安全与黑灰产防控所需（依据《网络安全法》留存必要日志）。</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>二、信息的使用</h2>
        <p>我们仅在以下目的范围内使用你的信息：提供服务与内容分发、改进产品体验、保障账号与平台安全（含识别与处置黑灰产、垃圾与诈骗内容）、履行法律义务，以及在你同意的前提下用于其他用途。</p>
      </section>

      <section className="legal-section">
        <h2>三、信息的共享与披露</h2>
        <p>我们<b>不会出售</b>你的个人信息。为实现服务所必需，我们可能将必要信息提供给以下第三方服务商：</p>
        <ul>
          <li><b>Supabase</b>：云数据库、身份认证与对象存储服务（数据存储于其云基础设施）；</li>
          <li><b>飞书</b>：当你通过反馈表单提交意见时，反馈内容将进入飞书多维表格用于问题处理。</li>
        </ul>
        <p>此外，仅在法律要求、监管要求或为保护平台与用户重大权益时，我们才可能依法披露必要信息。</p>
      </section>

      <section className="legal-section">
        <h2>四、信息的存储与安全</h2>
        <p>你的数据存储于我们选择的云服务基础设施中。我们采取合理的技术与管理措施保护数据安全（访问控制、加密传输、权限隔离、安全审计等），但无法绝对保证安全，请你妥善保管账号凭证。</p>
        <p>依据《网络安全法》等法律法规，我们会留存必要的网络安全日志，留存期限符合法定要求。</p>
      </section>

      <section className="legal-section">
        <h2>五、你的权利</h2>
        <p>你有权：<b>查询</b>与<b>更正</b>你的个人信息（可在个人主页与用户设置中自助完成）；<b>删除</b>你的内容；<b>注销账号</b>（账户安全 → 永久删除账号，注销后我们将依法删除或匿名化处理你的个人信息，法律法规要求留存的情形除外）；对自动化处理提出异议等。</p>
        <p>你可以随时撤回对外链分享、通知等功能的授权同意。</p>
      </section>

      <section className="legal-section">
        <h2>六、未成年人保护</h2>
        <p>引力面向具有完全民事行为能力的用户。若你未满 18 周岁，请在监护人同意并陪同下使用本平台；若你未满 14 周岁，请勿注册使用本平台，我们也不主动收集不满 14 周岁未成年人的个人信息。如发现误收集了未成年人信息，请及时联系我们删除。</p>
      </section>

      <section className="legal-section">
        <h2>七、Cookie 与本地存储</h2>
        <p>为维持登录状态与基础体验，我们会在你的浏览器中存储必要的 Cookie 与会话信息。你可以在浏览器设置中管理或清除，但可能影响登录等核心功能。</p>
      </section>

      <section className="legal-section">
        <h2>八、政策的更新</h2>
        <p>本政策可能随产品功能与法律法规的变化而更新，更新后将在页面公示并注明生效日期。重大变更我们将通过站内通知等方式告知。</p>
      </section>

      <section className="legal-section">
        <h2>九、联系我们</h2>
        <p>如对个人信息处理有任何疑问，或需要行使你的权利，请通过帮助中心、站内反馈或飞书反馈表单联系我们，我们将在合理期限内处理。</p>
      </section>
    </LegalLayout>
  );
}
