/**
 * 发布元信息共享组件（2026-08-29，发布表单共用）：
 * 分类 chips + 推广/原创标注（含披露/来源展开）——合规逻辑单一来源，避免两份重复
 */
"use client";

import { SQUARE_CATEGORIES, SOURCE_PLATFORMS } from "@/lib/config";

export function PublishMetaFields({
  category,
  onCategoryChange,
  isPromo,
  onPromoChange,
  commission,
  onCommissionChange,
  isOriginal,
  onOriginalChange,
  sourcePlatform,
  onSourcePlatformChange,
}: {
  category: string;
  onCategoryChange: (v: string) => void;
  isPromo: boolean;
  onPromoChange: (v: boolean) => void;
  commission: string;
  onCommissionChange: (v: string) => void;
  isOriginal: boolean;
  onOriginalChange: (v: boolean) => void;
  sourcePlatform: string;
  onSourcePlatformChange: (v: string) => void;
}) {
  return (
    <>
      {/* 可选标注（并排单行胶囊） */}
      <div className="publish-toggles">
        <label
          className={`publish-toggle${isPromo ? " on" : ""}`}
          title="含返佣、奖励、分佣等利益关系；勾选后需填写披露，帖子显示「机会」标识"
        >
          <input type="checkbox" checked={isPromo} onChange={(event) => onPromoChange(event.target.checked)} />
          <span>包含推广/返佣信息</span>
        </label>
        <label
          className={`publish-toggle${isOriginal ? " on" : ""}`}
          title="你在别处创作的内容（博客 / 视频 / 作品集…），可标注来源平台"
        >
          <input type="checkbox" checked={isOriginal} onChange={(event) => onOriginalChange(event.target.checked)} />
          <span>我的原创内容</span>
        </label>
      </div>

      {isPromo && (
        <div className="publish-toggle-sub">
          <label className="publish-field">
            <span>利益披露 <i className="publish-optional">必填</i></span>
            <input type="text" value={commission} onChange={(event) => onCommissionChange(event.target.value)} placeholder="如：邀请返佣比例、分佣比例、积分奖励等利益关系" aria-label="利益披露" />
          </label>
          <p className="publish-warning">推广内容含利益关系，请如实披露；平台将加官方「机会」标识，帮助用户识别。</p>
        </div>
      )}
      {isOriginal && (
        <div className="publish-toggle-sub">
          <label className="publish-field">
            <span>来源平台 <i className="publish-optional">选填</i></span>
            <select value={sourcePlatform} onChange={(event) => onSourcePlatformChange(event.target.value)} aria-label="来源平台">
              <option value="">不标注</option>
              {SOURCE_PLATFORMS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* 内容分类（固定枚举，默认「其他」可改） */}
      <div className="publish-field publish-type-field">
        <span>分类</span>
        <div className="publish-chips">
          {SQUARE_CATEGORIES.map((name) => (
            <button
              type="button"
              key={name}
              className={`publish-chip${category === name ? " active" : ""}`}
              onClick={() => onCategoryChange(name)}
            >{name}</button>
          ))}
        </div>
      </div>
    </>
  );
}
