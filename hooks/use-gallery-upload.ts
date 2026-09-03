/**
 * useGalleryUpload —— 帖子图集上传状态机（2026-09-03 自 components/app/common/rich-editor.tsx 抽取）
 * 富文本编辑器图集条的「预载 → 串行上传 → 失败重试 → 删除清理 → 排序 → 状态上抛」完整业务，
 * 发布（publish-modal）与编辑（square-post-edit-form）双场景共用同一实现，避免两处漂移。
 *
 * 职责边界（组件分层治理，见 AGENTS.md「组件职责分层」）：
 * - 本 hook：图集状态 + lib/storage 上传/清理编排 + 预载回退 + removedExisting 追踪 + 回调上抛
 * - 组件层：正文 <img> 节点同步移除（依赖 editor，属编辑器内核职责，见 removeImageFromDoc）
 *   与图集条渲染。删除入口应先在组件侧移除正文同 src 的 <img>，再调 removeItem。
 *
 * 与 lib/storage 分工：storage 为纯函数层（validate/upload/url/remove），本 hook 编排其调用时序。
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { extractImageUrls } from "@/lib/rich-content";
import { publicImageUrl, removeImage, uploadImage, validateImage, pathFromPublicUrl } from "@/lib/storage";

/** 图集图片上限（2026-08-31：与 5MB/张 校验协同防滥用） */
export const GALLERY_MAX = 9;

export type GalleryItem = {
  /** 本地唯一 key（上传成功前用于定位条目） */
  key: string;
  /** storage path（上传成功后才有，删除/清理用） */
  path: string;
  /** 完整公开 URL（插入正文用） */
  src: string;
  status: "uploading" | "done" | "error";
  /** 原始文件（重试用） */
  file?: File;
  /** 来源：upload=本次新上传（孤儿，删即清 storage）；existing=编辑预载的存量图（删后延迟到保存才清 storage） */
  origin: "upload" | "existing";
};

export function useGalleryUpload({
  upload,
  initialContent,
  initialGalleryPaths,
  onUploadedChange,
  onRemovedExistingChange,
}: {
  /** 图片上传凭证（发布/编辑场景提供后显示图片按钮） */
  upload?: { userId: string; postId: string };
  /** 编辑场景：存量正文 HTML（图集为空时回退正文存量图提取；旧帖兼容） */
  initialContent?: string;
  /** 编辑场景：已有序图集 storage path（037，优先预载） */
  initialGalleryPaths?: string[];
  /** 已成功上传的 storage path 列表（外层用于封面/孤儿清理；编辑场景可不传） */
  onUploadedChange?: (paths: string[]) => void;
  /** 编辑场景：被用户删除的存量图（origin=existing）storage path 列表（保存成功后才真删，避免取消编辑 → content 回滚仍引用 → 404） */
  onRemovedExistingChange?: (paths: string[]) => void;
}) {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryHint, setGalleryHint] = useState("");
  /** 被删除的存量图 path（延迟到保存才清 storage） */
  const [removedExisting, setRemovedExisting] = useState<string[]>([]);
  /** 串行上传锁（一次一张防配额突刺） */
  const uploading = useRef(false);

  /* 编辑场景预载存量图：initialGalleryPaths（037 新模型有序图集）优先；空则回退正文已有 <img>（旧帖兼容）
   * 预载条目 origin=existing：删除仅标记待删（onRemovedExistingChange），保存成功才清 storage
   * 首值 ref 捕获：value/galleryPaths 为父组件受控态，仅首次挂载预载一次 */
  const initialRef = useRef({ content: initialContent, paths: initialGalleryPaths });
  useEffect(() => {
    const fromGallery = initialRef.current.paths ?? [];
    const fromBody = initialRef.current.content
      ? extractImageUrls(initialRef.current.content)
          .map((url) => pathFromPublicUrl(url))
          .filter((p): p is string => Boolean(p))
      : [];
    /* 去重保序：图集优先 + 正文存量兜底（旧帖）；顺序 = 展示顺序 + 封面 */
    const paths = [...new Set([...fromGallery, ...fromBody])];
    if (!paths.length) return;
    setGallery(
      paths.map((path, i) => ({
        key: `e${i}-${path}`,
        path,
        src: publicImageUrl("post", path),
        status: "done" as const,
        origin: "existing" as const,
      })),
    );
  }, []);

  /* 上传成功列表上抛（外层取封面 = 第 1 张，未提交关闭时清理孤儿文件） */
  useEffect(() => {
    onUploadedChange?.(gallery.filter((it) => it.status === "done" && it.path).map((it) => it.path));
  }, [gallery, onUploadedChange]);

  /* 被删存量图上抛（外层保存成功后清 storage） */
  useEffect(() => {
    onRemovedExistingChange?.(removedExisting);
  }, [removedExisting, onRemovedExistingChange]);

  /** 上传中的条目数（图集条按钮禁用态） */
  const uploadingCount = gallery.filter((it) => it.status === "uploading").length;

  /** 多选图片 → 逐张串行上传（一次一张防配额突刺）→ 进图集条（不自动插入正文） */
  async function pickFiles(files: FileList | null) {
    if (!files || !upload || uploading.current) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    if (gallery.length + list.length > GALLERY_MAX) {
      setGalleryHint(`图片最多 ${GALLERY_MAX} 张`);
      return;
    }
    setGalleryHint("");
    for (const file of list) {
      const invalid = validateImage(file);
      if (invalid) {
        setGalleryHint(invalid);
        continue;
      }
      const key = `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      setGallery((g) => [...g, { key, path: "", src: "", status: "uploading", file, origin: "upload" }]);
      uploading.current = true;
      try {
        const path = await uploadImage("post", file, upload.userId, upload.postId);
        setGallery((g) => g.map((it) => (it.key === key ? { ...it, path, src: publicImageUrl("post", path), status: "done" } : it)));
      } catch {
        setGallery((g) => g.map((it) => (it.key === key ? { ...it, status: "error" } : it)));
      } finally {
        uploading.current = false;
      }
    }
  }

  /** 失败重试：用条目保留的原始 File 重新上传 */
  async function retryUpload(item: GalleryItem) {
    if (!upload || !item.file || uploading.current) return;
    setGallery((g) => g.map((it) => (it.key === item.key ? { ...it, status: "uploading" } : it)));
    uploading.current = true;
    try {
      const path = await uploadImage("post", item.file, upload.userId, upload.postId);
      setGallery((g) => g.map((it) => (it.key === item.key ? { ...it, path, src: publicImageUrl("post", path), status: "done" } : it)));
    } catch {
      setGallery((g) => g.map((it) => (it.key === item.key ? { ...it, status: "error" } : it)));
    } finally {
      uploading.current = false;
    }
  }

  /** 从图集移除条目 + storage 清理编排（正文 <img> 移除由组件层做）：
   *  upload=本次新上传（从未入库，孤儿）→ 立即删 storage
   *  existing=编辑预载的存量图 → 仅标记待删，保存成功才真删（避免取消编辑后 content 回滚仍引用已删文件 → 404） */
  function removeItem(item: GalleryItem) {
    setGallery((g) => g.filter((it) => it.key !== item.key));
    if (item.origin === "upload" && item.path) {
      void removeImage("post", item.path).catch(() => {});
    } else if (item.origin === "existing" && item.path) {
      setRemovedExisting((prev) => (prev.includes(item.path) ? prev : [...prev, item.path]));
    }
  }

  /** 图集排序（左移/右移，037：顺序 = 展示顺序 + 第 1 张封面）；移动后 onUploadedChange 自动上抛新顺序 */
  function moveItem(index: number, dir: -1 | 1) {
    setGallery((g) => {
      const target = index + dir;
      if (target < 0 || target >= g.length) return g;
      const next = [...g];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  return { gallery, galleryHint, uploadingCount, pickFiles, retryUpload, removeItem, moveItem };
}
