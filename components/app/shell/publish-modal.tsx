/**
 * 发布弹窗（client，2026-08-23 三入口改版：分享 / 机会 / 内容）
 * 统一发布到广场（square_posts）——广场 = 全量供给池，首页从广场精选推荐
 * ① 分享 share        —— 我发现了一个东西，想推荐给更多人（工具/产品/知识库/项目）
 * ② 机会 opportunity  —— 可参与、邀请、获得奖励的机会（分佣披露合规 + 官方标识）
 * ③ 内容 content      —— 我在别处创作的内容，跨平台公开分发（来源平台标识）
 * 字段矩阵：正文（必填）+ 外链（机会/内容必填，分享选填，正文含链接自动提取）
 *          + 内容分类（12 选 1 默认「其他」）+ 佣金/奖励披露（机会选填）
 *          + 来源平台（内容选填）+ 配图（选填）
 * 提交成功后 dispatch SQUARE_UPDATED_EVENT，广场重新拉取（刷新不丢）
 */
"use client";

import { useEffect, useState } from "react";
import { ICONS } from "@/lib/icons";
import { SQUARE_CATEGORIES, SOURCE_PLATFORMS, SQUARE_POST_TYPES } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { SQUARE_UPDATED_EVENT } from "@/lib/queries";
import { extractTags, extractUrl } from "@/lib/text";
import { sanitizeUrl } from "@/lib/url-policy";
import { removeImage, uploadImage, validateImage } from "@/lib/storage";

type Step = "choose" | "share" | "opportunity" | "content";

/* A2 修复（2026-08-23）：post_type 由 SQUARE_POST_TYPES 枚举驱动（与迁移 015 CHECK 同源），不再写死字面量 */
const [PT_SHARE, PT_OPPORTUNITY, PT_CONTENT] = SQUARE_POST_TYPES;

export default function PublishModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("choose");
  const [submitted, setSubmitted] = useState(false);
  /* 提交错误文案（空 = 无错误） */
  const [submitError, setSubmitError] = useState("");

  /* 三入口共用字段（按 step 条件渲染） */
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>("其他");
  /* 机会：佣金/奖励披露（选填，合规必需） */
  const [commission, setCommission] = useState("");
  /* 内容：来源平台（选填，跨平台分发标识） */
  const [sourcePlatform, setSourcePlatform] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** 生成防重复短 id（同毫秒连发也唯一） */
  function newId(prefix: string): string {
    return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  /** 入口跳转：清空上一步错误 */
  function go(next: Step) {
    setSubmitError("");
    setStep(next);
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    /* V4：外链入库前标准化（不信任用户输入）——非法 URL 返回 null */
    const link = sanitizeUrl(url);
    if (!link) {
      /* 分享入口外链选填（无效应忽略）；机会/内容必填（无效则提示） */
      if (step === "opportunity") {
        setSubmitError("请填写有效的参与/邀请网址");
        return;
      }
      if (step === "content") {
        setSubmitError("请填写有效的内容链接");
        return;
      }
    }
    /* 机会 / 内容：外链必填（分享选填，正文含链接时自动提取） */
    if (step !== "share" && !link) {
      setSubmitError(step === "opportunity" ? "请填写参与/邀请网址" : "请填写内容链接");
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSubmitError("");
    const id = newId("s");
    let imageUrl: string | undefined;
    if (image) {
      try {
        imageUrl = await uploadImage("post", image, user.id, id);
      } catch {
        setSubmitError("图片上传失败，请重试");
        return;
      }
    }
    const bodyUrl = extractUrl(body);
    const base = {
      id,
      author_id: user.id,
      content: body,
      category,
      tags: extractTags(body),
      url: link ?? (bodyUrl ? sanitizeUrl(bodyUrl) : null) ?? null,
      image_url: imageUrl ?? null,
    };
    const extra =
      step === "opportunity"
        ? { post_type: PT_OPPORTUNITY, commission: commission.trim() || null }
        : step === "content"
          ? { post_type: PT_CONTENT, source_platform: sourcePlatform || null }
          : { post_type: PT_SHARE };
    const { error } = await supabase.from("square_posts").insert({ ...base, ...extra });
    if (error) {
      /* BUG-14：insert 失败回滚已上传的配图，避免孤儿文件 */
      if (imageUrl) void removeImage("post", imageUrl);
      setSubmitError("发布失败，请重试");
      return;
    }
    window.dispatchEvent(new Event(SQUARE_UPDATED_EVENT));
    finish();
  }

  /** 配图选择（三入口共用，选填）：前端校验 + 本地预览 */
  function onImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const invalid = validateImage(file);
    if (invalid) {
      setSubmitError(invalid);
      return;
    }
    setSubmitError("");
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function finish() {
    setSubmitted(true);
  }

  const STEP_META: Record<Step, string> = {
    choose: "发布动态",
    share: "分享",
    opportunity: "机会",
    content: "内容",
  };

  const PLACEHOLDER =
    step === "share"
      ? "说几句推荐语，如：这个 AI 工具很好用 / 这个 3D 建模平台最近有活动 / 这个 GitHub 项目值得关注…（可加 #标签）"
      : step === "opportunity"
        ? "介绍这个机会：如何参与、能获得什么奖励…（如：邀请好友注册可获得佣金；分享专栏可获得 30% 分佣）"
        : "介绍你的内容：这是什么样的博客 / 文章 / 视频 / 作品集…（可加 #标签）";

  const URL_LABEL =
    step === "share"
      ? "链接（可选）"
      : step === "opportunity"
        ? "参与/邀请网址（必填）"
        : "内容链接（必填）";

  const SUBMIT_TEXT =
    step === "share" ? "发布分享"
      : step === "opportunity" ? "发布机会"
        : "发布内容";

  return (
    <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title" onClick={onClose}>
      <div className="modal-box publish-box" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 id="publish-title">{STEP_META[step]}</h2>
          <button type="button" onClick={onClose} aria-label="关闭">{ICONS.close}</button>
        </div>

        {submitted ? (
          <div className="publish-success">
            <p role="status">已发布</p>
            <button className="publish-submit" type="button" onClick={onClose}>完成</button>
          </div>
        ) : step === "choose" ? (
          <div className="publish-entry">
            <button className="publish-entry-card" type="button" onClick={() => go("share")}>
              <span className="publish-entry-icon">{ICONS.discover}</span>
              <span className="publish-entry-text">
                <strong>分享</strong>
                <small>我发现了一个东西，想推荐给更多人</small>
                <em>工具 / 产品 / 知识库 / 项目 · 广场核心场景</em>
              </span>
              <span className="publish-entry-arrow">→</span>
            </button>
            <button className="publish-entry-card promo" type="button" onClick={() => go("opportunity")}>
              <span className="publish-entry-icon">{ICONS.opportunity}</span>
              <span className="publish-entry-text">
                <strong>机会<i className="publish-tag-promo">机会</i></strong>
                <small>可参与、邀请、获得奖励的机会，缺传播渠道</small>
                <em>官方标识 · 合规披露</em>
              </span>
              <span className="publish-entry-arrow">→</span>
            </button>
            <button className="publish-entry-card topic" type="button" onClick={() => go("content")}>
              <span className="publish-entry-icon">{ICONS.knowledge}</span>
              <span className="publish-entry-text">
                <strong>内容</strong>
                <small>我在别处创作的内容，让更多人发现</small>
                <em>博客 / 文章 / 视频 / 作品集 · 跨平台分发</em>
              </span>
              <span className="publish-entry-arrow">→</span>
            </button>
          </div>
        ) : (
          <form className="publish-immersive" onSubmit={handleSubmit}>
            <button className="publish-back" type="button" onClick={() => go("choose")}>← 返回</button>
            <textarea
              autoFocus
              rows={6}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={PLACEHOLDER}
              aria-label={`${STEP_META[step]}正文`}
            />

            <label className="publish-field">
              <span>{URL_LABEL}</span>
              <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" aria-label={URL_LABEL} />
            </label>

            {step === "opportunity" && (
              <label className="publish-field">
                <span>佣金 / 奖励披露 <i className="publish-optional">选填</i></span>
                <input type="text" value={commission} onChange={(event) => setCommission(event.target.value)} placeholder="如：邀请返佣比例、分佣比例、积分奖励等利益关系" aria-label="佣金披露" />
              </label>
            )}

            {step === "content" && (
              <label className="publish-field">
                <span>来源平台 <i className="publish-optional">选填</i></span>
                <select value={sourcePlatform} onChange={(event) => setSourcePlatform(event.target.value)} aria-label="来源平台">
                  <option value="">不标注</option>
                  {SOURCE_PLATFORMS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
            )}

            {/* 内容分类（固定枚举，默认「其他」可改；分类是内容属性，与 #标签 分离） */}
            <div className="publish-field publish-type-field">
              <span>分类</span>
              <div className="publish-chips">
                {SQUARE_CATEGORIES.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className={`publish-chip${category === name ? " active" : ""}`}
                    onClick={() => setCategory(name)}
                  >{name}</button>
                ))}
              </div>
            </div>

            {/* 配图（选填） */}
            <div className="publish-topic-image">
              {imagePreview && (
                /* eslint-disable-next-line @next/next/no-img-element -- 本地预览 */
                <img className="publish-topic-image-preview" src={imagePreview} alt="配图预览" />
              )}
              <input
                id="publish-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={onImageChange}
              />
              <label className="publish-topic-image-btn" htmlFor="publish-image" role="button">
                {imagePreview ? "更换图片" : "添加图片（可选）"}
              </label>
              {imagePreview && (
                <button
                  type="button"
                  className="publish-topic-image-btn remove"
                  onClick={() => {
                    setImage(null);
                    setImagePreview("");
                  }}
                >移除</button>
              )}
            </div>

            {step === "opportunity" && (
              <p className="publish-warning">机会内容含推广利益关系，请如实披露；平台将对机会内容加官方标识，帮助用户识别。</p>
            )}

            {submitError && <p className="publish-error" role="alert">{submitError}</p>}
            <button className="publish-immersive-submit" type="submit">{SUBMIT_TEXT}</button>
          </form>
        )}
      </div>
    </div>
  );
}
