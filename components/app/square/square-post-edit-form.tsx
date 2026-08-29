/**
 * 广场帖编辑表单（client，详情页 / 个人主页共用）
 * 可改：正文（必填）+ 配图（可选：保留 / 换图 / 移除）
 * 链接（2026-08-29 收口）：与发布一致移除独立链接字段——链接统一由富文本正文 <a> 承载；
 *   update 不写 url（存量帖 url 保留，防误删历史链接）
 * 保存：update square_posts（RLS 作者）；换图/移除后联动清理旧图（BUG-14 模式）
 */
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { publicImageUrl, removeImage, uploadImage, validateImage } from "@/lib/storage";
import { SQUARE_CATEGORIES } from "@/lib/config";
import { isRichText, sanitizeHtml } from "@/lib/rich-content";
import { RichEditor } from "@/components/app/common/rich-editor";
import type { SquarePostDTO } from "@/lib/types";

export function SquarePostEditForm({
  post,
  onDone,
  onCancel,
}: {
  post: SquarePostDTO;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(post.content);
  /* 富文本帖：编辑器编辑（2026-08-29）；纯文本帖：textarea */
  const isRich = isRichText(post.content);
  /* 内容分类（固定枚举，随帖子展示模型传入） */
  const [category, setCategory] = useState(post.category);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  /* true = 保留原图；false = 移除配图（换新图时自动覆盖） */
  const [keepImage, setKeepImage] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function onImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const invalid = validateImage(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    /* 富文本空态：剥标签后无文字视为空 */
    const text = content.replace(/<[^>]*>/g, "").trim();
    if (!text || busy) return;
    setBusy(true);
    setError("");
    let nextImage: string | null = keepImage ? (post.imageUrl ?? null) : null;
    if (image) {
      try {
        nextImage = await uploadImage("post", image, post.authorId, post.id);
      } catch {
        setError("图片上传失败，请重试");
        setBusy(false);
        return;
      }
    }
    const { error: updateError } = await createClient()
      .from("square_posts")
      /* 富文本保存前 sanitize（主防线，与发布一致）；url 不再写入（存量帖 url 保留，防误删历史链接） */
      .update({ content: isRich ? sanitizeHtml(content) : content.trim(), image_url: nextImage, category })
      .eq("id", post.id);
    if (updateError) {
      /* 回滚新图，避免孤儿文件 */
      if (image && nextImage) void removeImage("post", nextImage);
      setError("保存失败，请重试");
      setBusy(false);
      return;
    }
    /* 换图 / 移除：清理旧图 */
    if ((image || !keepImage) && post.imageUrl && post.imageUrl !== nextImage) {
      void removeImage("post", post.imageUrl);
    }
    setBusy(false);
    onDone();
  }

  return (
    <form className="square-post-edit" onSubmit={(event) => void save(event)} onClick={(event) => event.stopPropagation()}>
      {isRich ? (
        <RichEditor value={content} onChange={setContent} upload={{ userId: post.authorId, postId: post.id }} />
      ) : (
        <textarea
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          aria-label="编辑正文"
          autoFocus
        />
      )}

      {/* 内容分类（固定枚举，分类是内容属性，与 #标签 分离） */}
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

      <div className="square-post-edit-image">
        {/* 当前展示图：新预览 > 保留原图 > 无 */}
        {imagePreview ? (
          /* eslint-disable-next-line @next/next/no-img-element -- 本地预览 */
          <img className="square-post-edit-image-preview" src={imagePreview} alt="新配图预览" />
        ) : keepImage && post.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */
          <img className="square-post-edit-image-preview" src={publicImageUrl("post", post.imageUrl)} alt="当前配图" />
        ) : null}

        <input
          id={`square-edit-image-${post.id}`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={onImageChange}
        />
        <label className="square-post-edit-image-btn" htmlFor={`square-edit-image-${post.id}`} role="button">
          {image ? "更换图片" : post.imageUrl ? "更换图片" : "添加图片"}
        </label>
        {(post.imageUrl || image) && (
          <button
            type="button"
            className="square-post-edit-image-btn remove"
            onClick={() => {
              setImage(null);
              setImagePreview("");
              setKeepImage(false);
            }}
          >移除图片</button>
        )}
      </div>

      {error && <p className="square-post-edit-error" role="alert">{error}</p>}

      <div className="square-post-edit-actions">
        <button type="button" onClick={onCancel}>取消</button>
        <button type="submit" disabled={busy || !content.replace(/<[^>]*>/g, "").trim()}>{busy ? "保存中…" : "保存"}</button>
      </div>
    </form>
  );
}
