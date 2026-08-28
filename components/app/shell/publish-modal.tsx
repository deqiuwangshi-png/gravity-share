/**
 * 发布弹窗（client，2026-08-27 三入口合并改版）
 * 分享 / 机会 / 内容 三入口 → 单一表单 + 两个可选标注（产品决策：发布性质从「必选入口」降级为「可选标注」）
 * 统一发布到广场（square_posts）——广场 = 全量供给池，首页从广场精选推荐
 * 表单字段：正文（必填）+ 外链（选填，正文含链接自动提取）+ 内容分类（12 选 1 默认「其他」）+ 配图（选填）
 * 可选标注（默认都不勾，post_type 由标注映射，库结构不变，015 CHECK 不破）：
 *   ① 推广/有利益关系 → 勾选后必填利益披露 → 帖子标记「机会」（post_type=opportunity，合规必需）
 *   ② 我的原创内容 → 勾选后选来源平台 → 帖子标记「内容」（post_type=content）
 *   都不勾 → 普通分享（post_type=share）
 * 提交成功后 dispatch SQUARE_UPDATED_EVENT，广场重新拉取（刷新不丢）
 */
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SQUARE_CATEGORIES, SOURCE_PLATFORMS, SQUARE_POST_TYPES } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { SQUARE_UPDATED_EVENT } from "@/lib/queries";
import { extractTags, extractUrl } from "@/lib/text";
import { sanitizeUrl } from "@/lib/url-policy";
import { removeImage, uploadImage, validateImage } from "@/lib/storage";

/* A2 修复（2026-08-23）：post_type 由 SQUARE_POST_TYPES 枚举驱动（与迁移 015 CHECK 同源），不再写死字面量 */
const [PT_SHARE, PT_OPPORTUNITY, PT_CONTENT] = SQUARE_POST_TYPES;

export default function PublishModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  /* 提交错误文案（空 = 无错误） */
  const [submitError, setSubmitError] = useState("");

  /* 共用字段 */
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string>("其他");
  /* 可选标注 ①：推广 / 有利益关系（勾选后披露必填，合规必需） */
  const [isPromo, setIsPromo] = useState(false);
  const [commission, setCommission] = useState("");
  /* 可选标注 ②：我的原创内容（勾选后选来源平台） */
  const [isOriginal, setIsOriginal] = useState(false);
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

  /* 两个标注互斥：一个帖子要么推广、要么原创、要么普通分享（post_type 三选一） */
  function togglePromo(v: boolean) {
    setIsPromo(v);
    if (v) setIsOriginal(false);
  }

  function toggleOriginal(v: boolean) {
    setIsOriginal(v);
    if (v) setIsPromo(false);
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    /* V4：外链入库前标准化（不信任用户输入）——非法 URL 返回 null（合并后统一选填，无效忽略） */
    const link = sanitizeUrl(url);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSubmitError("");
    /* 合规红线：勾选推广必须披露利益关系，否则拦截 */
    if (isPromo && !commission.trim()) {
      setSubmitError("勾选了推广/有利益关系，请填写利益披露（如返佣比例、奖励内容）");
      return;
    }
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
    /* 标注映射 post_type（015 CHECK 约束三值，库结构不变） */
    const extra = isPromo
      ? { post_type: PT_OPPORTUNITY, commission: commission.trim() || null, source_platform: null }
      : isOriginal
        ? { post_type: PT_CONTENT, source_platform: sourcePlatform || null, commission: null }
        : { post_type: PT_SHARE, commission: null, source_platform: null };
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

  /** 配图选择（选填）：前端校验 + 本地预览 */
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

  return (
    <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title" onClick={onClose}>
      <div className="modal-box publish-box" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 id="publish-title">发布</h2>
          <button type="button" onClick={onClose} aria-label="关闭"><X size={16} /></button>
        </div>

        {submitted ? (
          <div className="publish-success">
            <p role="status">已发布</p>
            <button className="publish-submit" type="button" onClick={onClose}>完成</button>
          </div>
        ) : (
          <form className="publish-immersive" onSubmit={handleSubmit}>
            <textarea
              autoFocus
              rows={6}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="分享你发现的好东西，或介绍你的内容…（可加 #标签）"
              aria-label="发布正文"
            />

            <label className="publish-field">
              <span>链接 <i className="publish-optional">选填</i></span>
              <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" aria-label="链接" />
            </label>

            {/* 可选标注（并排单行胶囊，悬浮 title 详细说明；勾选后展开披露/来源） */}
            <div className="publish-toggles">
              <label
                className={`publish-toggle${isPromo ? " on" : ""}`}
                title="含返佣、奖励、分佣等利益关系；勾选后需填写披露，帖子显示「机会」标识"
              >
                <input type="checkbox" checked={isPromo} onChange={(event) => togglePromo(event.target.checked)} />
                <span>包含推广/返佣信息</span>
              </label>
              <label
                className={`publish-toggle${isOriginal ? " on" : ""}`}
                title="你在别处创作的内容（博客 / 视频 / 作品集…），可标注来源平台"
              >
                <input type="checkbox" checked={isOriginal} onChange={(event) => toggleOriginal(event.target.checked)} />
                <span>我的原创内容</span>
              </label>
              {/* 配图（选填，与标注同一水平行） */}
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
            </div>
            {isPromo && (
              <div className="publish-toggle-sub">
                <label className="publish-field">
                  <span>利益披露 <i className="publish-optional">必填</i></span>
                  <input type="text" value={commission} onChange={(event) => setCommission(event.target.value)} placeholder="如：邀请返佣比例、分佣比例、积分奖励等利益关系" aria-label="利益披露" />
                </label>
                <p className="publish-warning">推广内容含利益关系，请如实披露；平台将加官方「机会」标识，帮助用户识别。</p>
              </div>
            )}
            {isOriginal && (
              <div className="publish-toggle-sub">
                <label className="publish-field">
                  <span>来源平台 <i className="publish-optional">选填</i></span>
                  <select value={sourcePlatform} onChange={(event) => setSourcePlatform(event.target.value)} aria-label="来源平台">
                    <option value="">不标注</option>
                    {SOURCE_PLATFORMS.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>
              </div>
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

            {submitError && <p className="publish-error" role="alert">{submitError}</p>}
            <button className="publish-immersive-submit" type="submit">发布</button>
          </form>
        )}
      </div>
    </div>
  );
}
