/**
 * 发布弹窗（client，三入口定稿，2b 起写库）
 * Step 1 选择入口：
 *   A 推荐好东西 —— 沉浸式随手写 → insert discoveries（首页内容流）
 *   B 推广外链 —— 推广图片（必填）+ 推广内容（≥100 字）+ 推广网址 + 推广类型
 *                + 商业说明（选填，佣金等利益关系）→ insert discoveries（commercial，官方标识）
 *   C 话题帖子 —— 沉浸式 + 可选链接 + #标签可选 → insert square_posts
 * 提交成功后 dispatch 数据变更事件，内容流 / 广场重新拉取（刷新不丢）
 */
"use client";

import { useEffect, useState } from "react";
import { ICONS } from "@/lib/icons";
import { PROMO_TARGETS, PUBLISH_TYPES } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { DISCOVERY_UPDATED_EVENT, SQUARE_UPDATED_EVENT } from "@/lib/queries";
import { extractTags, extractUrl, judgeKind } from "@/lib/text";
import { removeImage, uploadImage, validateImage } from "@/lib/storage";

type Step = "choose" | "content" | "promo" | "topic";

/** 推广内容最少字数（2026-08-22 定稿：100 字以上） */
const PROMO_MIN_LENGTH = 100;

export default function PublishModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("choose");
  const [submitted, setSubmitted] = useState(false);
  /* 提交错误文案（空 = 无错误；2026-08-22 从 boolean 改 string，支持字段级具体提示） */
  const [submitError, setSubmitError] = useState("");

  /* 入口 A：沉浸式正文 */
  const [content, setContent] = useState("");
  /* 入口 A：分类（BUG-5 归一，默认「内容」不强制，落库为 categories.name） */
  const [contentType, setContentType] = useState<string>("内容");

  /* 入口 B：推广字段（2026-08-22 改版：图片必填 / 内容 ≥100 字 / 网址必填 / 类型必填 / 商业说明选填） */
  const [promoContent, setPromoContent] = useState("");
  const [promoUrl, setPromoUrl] = useState("");
  const [promoType, setPromoType] = useState<string>(PROMO_TARGETS[0]);
  const [promoBiz, setPromoBiz] = useState(""); /* 商业说明（选填，替代原「佣金条件」） */
  const [promoImage, setPromoImage] = useState<File | null>(null);
  const [promoImagePreview, setPromoImagePreview] = useState("");

  /* 入口 C：话题字段 */
  const [topicContent, setTopicContent] = useState("");
  const [topicUrl, setTopicUrl] = useState("");
  const [topicImage, setTopicImage] = useState<File | null>(null);
  const [topicImagePreview, setTopicImagePreview] = useState("");

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

  async function handleContentSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = content.trim();
    if (!text) return;
    const url = extractUrl(text);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("discoveries").insert({
      id: newId("u"),
      author_id: user.id,
      type: contentType, /* BUG-5：分类归一，落库 categories.name（默认「内容」） */
      note: text,
      source: (user.user_metadata?.name as string) || "引力用户",
      tags: extractTags(text),
      url,
      kind: judgeKind(url),
    });
    if (error) {
      setSubmitError("发布失败，请重试");
      return;
    }
    window.dispatchEvent(new Event(DISCOVERY_UPDATED_EVENT));
    finish();
  }

  async function handlePromoSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = promoContent.trim();
    const url = promoUrl.trim();
    /* 2026-08-22 改版校验：网址必填 / 内容 ≥100 字 / 图片必填 / 类型必填（默认第一项）；商业说明选填 */
    if (!url) {
      setSubmitError("请填写推广网址");
      return;
    }
    if (text.length < PROMO_MIN_LENGTH) {
      setSubmitError(`推广内容不少于 ${PROMO_MIN_LENGTH} 字（当前 ${text.length} 字）`);
      return;
    }
    if (!promoImage) {
      setSubmitError("请上传推广图片");
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSubmitError("");
    const id = newId("u");
    /* 先传图（posts 桶），失败不落库 */
    let imageUrl: string | undefined;
    try {
      imageUrl = await uploadImage("post", promoImage, user.id, id);
    } catch {
      setSubmitError("图片上传失败，请重试");
      return;
    }
    const { error } = await supabase.from("discoveries").insert({
      id,
      author_id: user.id,
      type: "商业推广", /* 2b 修正：原 mock 写「推广」，与分类事实源收不拢 */
      note: text,
      source: (user.user_metadata?.name as string) || "引力用户",
      tags: extractTags(text),
      url,
      commercial: true,
      promo_type: promoType,
      commission: promoBiz.trim() || null, /* 商业说明选填，空则存 null */
      media_url: imageUrl, /* 推广图片：详情页外链预览卡展示 */
      kind: judgeKind(url),
    });
    if (error) {
      /* BUG-14：insert 失败回滚已上传图片，避免孤儿文件 */
      if (imageUrl) void removeImage("post", imageUrl);
      setSubmitError("发布失败，请重试");
      return;
    }
    window.dispatchEvent(new Event(DISCOVERY_UPDATED_EVENT));
    finish();
  }

  /** 推广图片选择：前端校验 + 本地预览（必填） */
  function onPromoImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const invalid = validateImage(file);
    if (invalid) {
      setSubmitError(invalid);
      return;
    }
    setSubmitError("");
    setPromoImage(file);
    setPromoImagePreview(URL.createObjectURL(file));
  }

  async function handleTopicSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = topicContent.trim();
    if (!text) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSubmitError("");
    const id = newId("s");
    let imageUrl: string | undefined;
    if (topicImage) {
      try {
        imageUrl = await uploadImage("post", topicImage, user.id, id);
      } catch {
        setSubmitError("图片上传失败，请重试");
        return;
      }
    }
    const { error } = await supabase.from("square_posts").insert({
      id,
      author_id: user.id,
      content: text,
      tags: extractTags(text),
      url: topicUrl.trim() || extractUrl(text),
      image_url: imageUrl ?? null,
    });
    if (error) {
      /* BUG-14：insert 失败回滚已上传的配图，避免孤儿文件 */
      if (imageUrl) void removeImage("post", imageUrl);
      setSubmitError("发布失败，请重试");
      return;
    }
    window.dispatchEvent(new Event(SQUARE_UPDATED_EVENT));
    finish();
  }

  /** 话题配图选择（S-1）：前端校验 + 本地预览 */
  function onTopicImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const invalid = validateImage(file);
    if (invalid) {
      setSubmitError(invalid);
      return;
    }
    setSubmitError("");
    setTopicImage(file);
    setTopicImagePreview(URL.createObjectURL(file));
  }

  function finish() {
    setSubmitted(true);
  }

  const stepTitle = step === "choose"
    ? "发布动态"
    : step === "content"
      ? "推荐好东西"
      : step === "promo"
        ? "推广外链（带分佣）"
        : "发布话题";

  return (
    <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title" onClick={onClose}>
      <div className="modal-box publish-box" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 id="publish-title">{stepTitle}</h2>
          <button type="button" onClick={onClose} aria-label="关闭">{ICONS.close}</button>
        </div>

        {submitted ? (
          <div className="publish-success">
            <p role="status">已发布</p>
            <button className="publish-submit" type="button" onClick={onClose}>完成</button>
          </div>
        ) : step === "choose" ? (
          <div className="publish-entry">
            <button className="publish-entry-card" type="button" onClick={() => setStep("content")}>
              <span className="publish-entry-icon">{ICONS.discover}</span>
              <span className="publish-entry-text">
                <strong>推荐好东西</strong>
                <small>随手写，三秒发布</small>
                <em>发布到首页内容流 · 无门槛</em>
              </span>
              <span className="publish-entry-arrow">→</span>
            </button>
            <button className="publish-entry-card promo" type="button" onClick={() => setStep("promo")}>
              <span className="publish-entry-icon">{ICONS.plaza}</span>
              <span className="publish-entry-text">
                <strong>推广外链（带分佣）<i className="publish-tag-promo">推广</i></strong>
                <small>推广 / 引流 / 分销专用</small>
                <em>官方标识 · 合规保护</em>
              </span>
              <span className="publish-entry-arrow">→</span>
            </button>
            <button className="publish-entry-card topic" type="button" onClick={() => setStep("topic")}>
              <span className="publish-entry-icon">{ICONS.knowledge}</span>
              <span className="publish-entry-text">
                <strong>话题帖子</strong>
                <small>广场发帖 · 讨论 / 求助 / 找方案</small>
                <em>公开开放 · 不限制领域</em>
              </span>
              <span className="publish-entry-arrow">→</span>
            </button>
          </div>
        ) : step === "content" ? (
          <form className="publish-immersive" onSubmit={handleContentSubmit}>
            <textarea
              autoFocus
              rows={7}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="说几句推荐语，或直接粘贴链接..."
              aria-label="发布内容"
            />
            <div className="publish-field publish-type-field">
              <span>分类</span>
              <div className="publish-chips">
                {PUBLISH_TYPES.map(({ name }) => (
                  <button
                    type="button"
                    key={name}
                    className={`publish-chip${contentType === name ? " active" : ""}`}
                    onClick={() => setContentType(name)}
                  >{name}</button>
                ))}
              </div>
            </div>
            {submitError && <p className="publish-error" role="alert">{submitError}</p>}
            <button className="publish-immersive-submit" type="submit">发布</button>
          </form>
        ) : step === "promo" ? (
          <form className="publish-form" onSubmit={handlePromoSubmit}>
            <button className="publish-back" type="button" onClick={() => setStep("choose")}>← 返回</button>

            {/* 推广图片（必填）：上传真实反映推广内容的图片 */}
            <div className="publish-field">
              <span>推广图片 <i className="publish-required">必填</i></span>
              <div className="publish-topic-image">
                {promoImagePreview && (
                  /* eslint-disable-next-line @next/next/no-img-element -- 本地预览 */
                  <img className="publish-topic-image-preview" src={promoImagePreview} alt="推广图片预览" />
                )}
                <input
                  id="promo-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={onPromoImageChange}
                />
                <label className="publish-topic-image-btn" htmlFor="promo-image" role="button">
                  {promoImagePreview ? "更换图片" : "上传图片"}
                </label>
                {promoImagePreview && (
                  <button
                    type="button"
                    className="publish-topic-image-btn remove"
                    onClick={() => {
                      setPromoImage(null);
                      setPromoImagePreview("");
                    }}
                  >移除</button>
                )}
              </div>
            </div>

            {/* 推广内容（必填，100 字以上；副文案作占位符，字数不足提交时提示） */}
            <label className="publish-field">
              <span>推广内容 <i className="publish-required">必填</i> · 不少于 {PROMO_MIN_LENGTH} 字</span>
              <textarea rows={5} value={promoContent} onChange={(event) => setPromoContent(event.target.value)} placeholder="介绍你希望用户了解的产品、服务、网站或项目。请确保内容真实、准确，不得进行虚假或误导性描述。" aria-label="推广内容" />
            </label>

            {/* 推广网址（必填） */}
            <label className="publish-field">
              <span>推广网址 <i className="publish-required">必填</i></span>
              <input type="url" value={promoUrl} onChange={(event) => setPromoUrl(event.target.value)} placeholder="用户点击后访问的实际网址，https://…" aria-label="推广网址" />
            </label>

            {/* 推广类型（必填，默认第一项） */}
            <div className="publish-field">
              <span>推广类型 <i className="publish-required">必填</i></span>
              <div className="publish-chips">
                {PROMO_TARGETS.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className={`publish-chip${promoType === name ? " active" : ""}`}
                    onClick={() => setPromoType(name)}
                  >{name}</button>
                ))}
              </div>
            </div>

            {/* 商业说明（选填） */}
            <label className="publish-field">
              <span>商业说明 <i className="publish-optional">选填</i></span>
              <input type="text" value={promoBiz} onChange={(event) => setPromoBiz(event.target.value)} placeholder="如：存在佣金、推广收益或其他商业利益关系" aria-label="商业说明" />
            </label>

            <p className="publish-warning">通过平台审核的推广内容将获得官方标识，帮助用户识别经过平台审核的公开信息。</p>
            {submitError && <p className="publish-error" role="alert">{submitError}</p>}

            <button className="publish-submit" type="submit">发布推广</button>
          </form>
        ) : (
          <form className="publish-immersive" onSubmit={handleTopicSubmit}>
            <textarea
              autoFocus
              rows={8}
              value={topicContent}
              onChange={(event) => setTopicContent(event.target.value)}
              placeholder="说点什么…求助、讨论、找解决方案都行，也可以在正文中加 #标签"
              aria-label="发布话题"
            />
            <input
              className="publish-topic-link"
              type="url"
              value={topicUrl}
              onChange={(event) => setTopicUrl(event.target.value)}
              placeholder="可选：贴一个链接"
              aria-label="可选外链"
            />
            <div className="publish-topic-image">
              {topicImagePreview && (
                /* eslint-disable-next-line @next/next/no-img-element -- 本地预览 */
                <img className="publish-topic-image-preview" src={topicImagePreview} alt="配图预览" />
              )}
              <input
                id="topic-image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={onTopicImageChange}
              />
              <label className="publish-topic-image-btn" htmlFor="topic-image" role="button">
                {topicImagePreview ? "更换图片" : "添加图片（可选）"}
              </label>
              {topicImagePreview && (
                <button
                  type="button"
                  className="publish-topic-image-btn remove"
                  onClick={() => {
                    setTopicImage(null);
                    setTopicImagePreview("");
                  }}
                >移除</button>
              )}
            </div>
            {submitError && <p className="publish-error" role="alert">{submitError}</p>}
            <button className="publish-immersive-submit" type="submit">发布</button>
          </form>
        )}
      </div>
    </div>
  );
}
