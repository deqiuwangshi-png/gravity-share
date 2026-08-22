/**
 * 广场帖编辑表单（client，详情页 / 个人主页共用）
 * 可改：正文（必填）+ 链接（可选）+ 配图（可选：保留 / 换图 / 移除）
 * 保存：update square_posts（RLS 作者）；换图/移除后联动清理旧图（BUG-14 模式）
 */
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { publicImageUrl, removeImage, uploadImage, validateImage } from "@/lib/storage";
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
  const [url, setUrl] = useState(post.url ?? "");
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
    const text = content.trim();
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
      .update({ content: text, url: url.trim() || null, image_url: nextImage })
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
      <textarea
        rows={4}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        aria-label="编辑正文"
        autoFocus
      />
      <input
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="链接（可选）"
        aria-label="帖子链接"
      />

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
        <button type="submit" disabled={busy || !content.trim()}>{busy ? "保存中…" : "保存"}</button>
      </div>
    </form>
  );
}
