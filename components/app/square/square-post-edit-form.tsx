/**
 * 广场帖编辑表单（client，详情页 / 个人主页共用）
 * 可改：标题（必填，2026-09-02 与发布同步——不允许清空，存量空标题帖编辑时须补填）+ 正文（必填）+ 图集图片（037：与发布一致第 1 张作封面；编辑打开预载存量图集 + 旧帖正文存量图；
 *   删除存量图延迟到保存才清 storage；保存时 stripImages 剥离正文 img，旧帖保存一次即升级新模型）
 * 链接（2026-08-29 收口）：与发布一致移除独立链接字段——链接统一由富文本正文 <a> 承载；
 *   update 不写 url（存量帖 url 保留，防误删历史链接）
 * 保存：update square_posts（RLS 作者）；换图/移除后联动清理旧图（BUG-14 模式）
 */
"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { removeImage, pathFromPublicUrl } from "@/lib/storage";
import { SQUARE_CATEGORIES } from "@/lib/config";
import { isRichText, sanitizeHtml, extractImageUrls, stripImages } from "@/lib/rich-content";
import { RichEditor } from "@/components/app/common/rich-editor";
import { Button } from "@/components/ui/button";
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
  /* 标题（038，2026-09-02 必填）：随帖展示模型传入；空 = 存量无标题帖，编辑保存时须补填 */
  const [title, setTitle] = useState(post.title ?? "");
  /* 富文本帖：编辑器编辑（2026-08-29）；纯文本帖：textarea */
  const isRich = isRichText(post.content);
  /* 内容分类（固定枚举，随帖子展示模型传入） */
  const [category, setCategory] = useState(post.category);
  /* 图集已上传路径（RichEditor onUploadedChange 上抛；封面 = 第 1 张，与发布一致；取消/失败清理孤儿） */
  const [galleryPaths, setGalleryPaths] = useState<string[]>([]);
  const onGalleryChange = useCallback((paths: string[]) => setGalleryPaths(paths), []);
  /* 打开时全部存量图 path（图集 + 正文存量，037 兼容：用于区分本次新上传孤儿，取消时只清新上传的） */
  const initialExisting = useRef(
    new Set([
      ...(post.gallery ?? []),
      ...extractImageUrls(post.content)
        .map((url) => pathFromPublicUrl(url))
        .filter((p): p is string => Boolean(p)),
    ]),
  );
  /* 被用户删除的存量图 path（保存成功后才真删 storage） */
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const onRemovedExistingChange = useCallback((paths: string[]) => setPendingDeletes(paths), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    /* 富文本空态：剥标签后无文字视为空 */
    const text = content.replace(/<[^>]*>/g, "").trim();
    /* 标题必填（2026-09-02 与发布同步）：trim 为空即拦截（存量无标题帖也不允许清空/留空保存） */
    if (!title.trim()) {
      setError("请填写标题");
      return;
    }
    if (!text || busy) return;
    setBusy(true);
    setError("");
    /* 统一图片模型（与发布一致，037）：封面 = 图集第 1 张；图集空且原封面未被删则保留原封面，否则（删光）置空，避免回退到已删文件 → 404 */
    const nextImage: string | null =
      galleryPaths[0] ?? (post.imageUrl && !pendingDeletes.includes(post.imageUrl) ? post.imageUrl : null);
    const { error: updateError } = await createClient()
      .from("square_posts")
      /* 富文本保存前 sanitize（主防线，与发布一致）+ stripImages 剥离正文 img（037：图片统一进图集，正文纯文字；
         旧帖正文存量图已由预载进 galleryPaths，保存即升级新模型）；url 不再写入（存量帖 url 保留，防误删历史链接） */
      .update({
        content: isRich ? stripImages(sanitizeHtml(content)) : content.trim(),
        /* 038 标题必填（2026-09-02 与发布同步）：校验已拦空，恒写入 trim 结果（不再写 null 清空标题） */
        title: title.trim(),
        image_url: nextImage,
        gallery: galleryPaths,
        category,
      })
      .eq("id", post.id);
    if (updateError) {
      /* 回滚本次新上传的孤儿图（仅 upload，existing 存量图不动——保存失败数据库未变，仍引用这些图） */
      galleryPaths
        .filter((path) => !initialExisting.current.has(path))
        .forEach((path) => void removeImage("post", path).catch(() => {}));
      setError("保存失败，请重试");
      setBusy(false);
      return;
    }
    /* 封面变更：清理旧封面图 */
    if (post.imageUrl && post.imageUrl !== nextImage) {
      void removeImage("post", post.imageUrl);
    }
    /* 保存成功：清理被删除的存量图（延迟删除，避免取消编辑 → content 回滚仍引用 → 404） */
    pendingDeletes.forEach((path) => void removeImage("post", path).catch(() => {}));
    setBusy(false);
    onDone();
  }

  /** 取消编辑：仅清理本次新上传且未删的孤儿图（existing 存量图不动——content 回滚后仍引用，删则 404） */
  function handleCancel() {
    galleryPaths
      .filter((path) => !initialExisting.current.has(path))
      .forEach((path) => void removeImage("post", path).catch(() => {}));
    onCancel();
  }

  return (
    <form className="mb-[14px] grid gap-[10px]" onSubmit={(event) => void save(event)} onClick={(event) => event.stopPropagation()}>
      {/* 标题（038，2026-09-02 必填）：与发布一致 */}
      <input
        className="w-full border-0 border-b border-line bg-transparent px-[2px] pb-[10px] pt-[4px] text-[18px] font-semibold leading-[1.5] text-foreground outline-none transition-[border-color] duration-[180ms] placeholder:text-[14px] placeholder:font-normal placeholder:text-soft focus:border-line-primary [font:inherit]"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="请输入标题"
        maxLength={60}
        aria-label="标题"
      />
      {isRich ? (
        <RichEditor value={content} onChange={setContent} upload={{ userId: post.authorId, postId: post.id }} onUploadedChange={onGalleryChange} onRemovedExistingChange={onRemovedExistingChange} galleryPaths={post.gallery} />
      ) : (
        <textarea
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          aria-label="编辑正文"
          autoFocus
          className="w-full min-h-[88px] resize-y rounded-[10px] border border-line-primary bg-surface px-3 py-[10px] text-[13px] leading-[1.6] text-foreground outline-none [font:inherit]"
        />
      )}

      {/* 内容分类（固定枚举，分类是内容属性，与 #标签 分离） */}
      <div className="grid gap-[6px]">
        <span className="text-[12px] font-semibold text-muted">分类</span>
        <div className="flex flex-wrap gap-2">
          {SQUARE_CATEGORIES.map((name) => (
            <button
              type="button"
              key={name}
              className={`cursor-pointer rounded-full border border-line bg-surface px-[13px] py-[6px] text-[12px] text-muted transition-[border-color,color,background-color] duration-[180ms] hover:border-line-primary hover:text-primary${category === name ? " border-primary bg-primary-soft font-semibold text-primary" : ""}`}
              onClick={() => setCategory(name)}
            >{name}</button>
          ))}
        </div>
      </div>

      {/* 图片管理已统一到正文 RichEditor 图集条（第 1 张作封面），无独立封面区 */}

      {error && <p className="m-0 text-[12px] text-error" role="alert">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={handleCancel}>取消</Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={busy || !content.replace(/<[^>]*>/g, "").trim()}
        >{busy ? "保存中…" : "保存"}</Button>
      </div>
    </form>
  );
}
