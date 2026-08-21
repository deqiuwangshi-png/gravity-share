/**
 * 发布弹窗（client，三入口定稿）
 * Step 1 选择入口：
 *   A 推荐好东西 —— 沉浸式随手写 → 发现流
 *   B 推广外链 —— 随手写 + 推广类型 + 佣金条件（带分佣，官方标识）→ 发现流
 *   C 话题帖子 —— 沉浸式 + 可选链接 + #标签可选 → 广场
 * 提交后追加进对应内容池，发现流 / 广场立即可见
 */
"use client";

import { useEffect, useState } from "react";
import { ICONS } from "@/lib/icons";
import { PROMO_TYPES } from "@/lib/config";
import { DISCOVERY_UPDATED_EVENT, publishDiscoveryItem } from "@/lib/discovery-store";
import { SQUARE_UPDATED_EVENT, publishSquarePost } from "@/lib/square-store";
import { extractTags, extractUrl, judgeKind } from "@/lib/text";

type Step = "choose" | "content" | "promo" | "topic";

export default function PublishModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("choose");
  const [submitted, setSubmitted] = useState(false);

  /* 入口 A：沉浸式正文 */
  const [content, setContent] = useState("");

  /* 入口 B：推广字段 */
  const [promoContent, setPromoContent] = useState("");
  const [promoUrl, setPromoUrl] = useState("");
  const [promoType, setPromoType] = useState<string>(PROMO_TYPES[0]);
  const [commission, setCommission] = useState("");

  /* 入口 C：话题字段 */
  const [topicContent, setTopicContent] = useState("");
  const [topicUrl, setTopicUrl] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function finish() {
    setSubmitted(true);
  }

  function handleContentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = content.trim();
    if (!text) return;
    const url = extractUrl(text);
    publishDiscoveryItem({
      id: `u${Date.now()}`,
      type: "内容",
      note: text,
      author: "我的账户",
      publishTime: "now",
      views: 0,
      likes: 0,
      comments: 0,
      source: "我的账户",
      tags: extractTags(text),
      url,
      kind: judgeKind(url),
    });
    window.dispatchEvent(new Event(DISCOVERY_UPDATED_EVENT));
    finish();
  }

  function handlePromoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = promoContent.trim();
    const url = promoUrl.trim();
    if (!text || !url || !commission.trim()) return;
    publishDiscoveryItem({
      id: `u${Date.now()}`,
      type: "推广",
      note: text,
      author: "我的账户",
      publishTime: "now",
      views: 0,
      likes: 0,
      comments: 0,
      source: "我的账户",
      tags: extractTags(text),
      url,
      commercial: true,
      promoType,
      commission: commission.trim(),
      kind: judgeKind(url),
    });
    window.dispatchEvent(new Event(DISCOVERY_UPDATED_EVENT));
    finish();
  }

  function handleTopicSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = topicContent.trim();
    if (!text) return;
    publishSquarePost({
      id: `u${Date.now()}`,
      author: "我的账户",
      content: text,
      tags: extractTags(text),
      likes: 0,
      comments: 0,
      views: 0,
      time: "刚刚",
      url: topicUrl.trim() || extractUrl(text),
    });
    window.dispatchEvent(new Event(SQUARE_UPDATED_EVENT));
    finish();
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
            <p role="status">已发布（Mock）</p>
            <button className="publish-submit" type="button" onClick={onClose}>完成</button>
          </div>
        ) : step === "choose" ? (
          <div className="publish-entry">
            <button className="publish-entry-card" type="button" onClick={() => setStep("content")}>
              <span className="publish-entry-icon">{ICONS.discover}</span>
              <span className="publish-entry-text">
                <strong>推荐好东西</strong>
                <small>随手写，三秒发布</small>
                <em>发布到发现流 · 无门槛</em>
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
              rows={9}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="说几句推荐语，或直接粘贴链接..."
              aria-label="发布内容"
            />
            <button className="publish-immersive-submit" type="submit">发布</button>
          </form>
        ) : step === "promo" ? (
          <form className="publish-form" onSubmit={handlePromoSubmit}>
            <button className="publish-back" type="button" onClick={() => setStep("choose")}>← 返回</button>

            <label className="publish-field">
              <span>推广文案</span>
              <textarea rows={3} value={promoContent} onChange={(event) => setPromoContent(event.target.value)} placeholder="说几句推广语…" required />
            </label>

            <label className="publish-field">
              <span>推广链接 *</span>
              <input type="url" value={promoUrl} onChange={(event) => setPromoUrl(event.target.value)} placeholder="https://…" required />
            </label>

            <div className="publish-field">
              <span>推广类型</span>
              <div className="publish-chips">
                {PROMO_TYPES.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className={`publish-chip${promoType === name ? " active" : ""}`}
                    onClick={() => setPromoType(name)}
                  >{name}</button>
                ))}
              </div>
            </div>

            <label className="publish-field">
              <span>佣金条件 *</span>
              <input type="text" value={commission} onChange={(event) => setCommission(event.target.value)} placeholder="如：分享得 30% 分佣" required />
            </label>

            <p className="publish-warning">走正规流程发布推广，平台将加官方标识（转化率更高）；交易风险请自行判断。</p>

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
            <button className="publish-immersive-submit" type="submit">发布</button>
          </form>
        )}
      </div>
    </div>
  );
}
