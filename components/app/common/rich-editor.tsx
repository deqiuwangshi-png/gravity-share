/**
 * 富文本编辑器（2026-08-29，TipTap）——富文本帖发布 / 编辑共用
 * 2026-09-02：rich-editor.css 全量 Tailwind 化（318 行 → 原子类，文件已删）；正文区排版并入
 *   共享排版层 rich-content.css（编辑/渲染双宿主并列选择器一处维护）；正文容器保留宿主类
 *   rich-editor-content（TipTap ProseMirror，非 JSX 元素 → 排版层 CSS 承载）；根保留宿主类
 *   rich-editor（供 .rich-editor.compact .rich-editor-content 组合选择器）；
 *   图集浮层非令牌 rgba 宿主类（rich-gallery-status/rich-gallery-actions）收 decor.css ⑨
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold, Italic, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Minus, Link2, ImagePlus, ArrowLeft, ArrowRight, X,
} from "lucide-react";
import { publicImageUrl, removeImage, uploadImage, validateImage, pathFromPublicUrl } from "@/lib/storage";
import { extractImageUrls } from "@/lib/rich-content";

/** 图集图片上限（2026-08-31：与 5MB/张 校验协同防滥用） */
const GALLERY_MAX = 9;

type GalleryItem = {
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

export function RichEditor({
  value,
  onChange,
  upload,
  compact,
  onUploadedChange,
  onRemovedExistingChange,
  galleryPaths,
}: {
  /** 初始 HTML（编辑场景传入存量内容） */
  value?: string;
  /** 内容变更回调（HTML） */
  onChange: (html: string) => void;
  /** 图片上传凭证（发布/编辑场景提供后显示图片按钮） */
  upload?: { userId: string; postId: string };
  /** 轻量模式（短帖发布）：工具栏常显，透明无边框 */
  compact?: boolean;
  /** 已成功上传的 storage path 列表（外层用于封面/孤儿清理；编辑场景可不传） */
  onUploadedChange?: (paths: string[]) => void;
  /** 编辑场景：被用户删除的存量图（origin=existing）storage path 列表（保存成功后才真删，避免取消编辑 → content 回滚仍引用 → 404） */
  onRemovedExistingChange?: (paths: string[]) => void;
  /** 编辑场景：已有序图集 storage path（037，优先预载；旧帖为空则回退正文存量图提取） */
  galleryPaths?: string[];
}) {
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryHint, setGalleryHint] = useState("");
  /** 被删除的存量图 path（延迟到保存才清 storage） */
  const [removedExisting, setRemovedExisting] = useState<string[]>([]);
  const editor = useEditor({
    /* Link 协议白名单（2026-08-29）：编辑器入口即拒绝 javascript:/data: 等危险协议，
     * 与渲染端 sanitizeHtmlForRender 的 URI 白名单形成双保险 */
    extensions: [
      /* StarterKit v3 默认内含 link：显式 link:false 关闭内建 link，避免与下方 Link.configure 重复注册（duplicate 'link'）；
       * 链接配置（autolink/linkOnPaste/openOnClick/isAllowedUri 白名单）统一收口在下方 Link.configure 一处 */
      StarterKit.configure({ link: false }),
      Link.configure({
        openOnClick: false,
        /* 2026-09-02：正文直接输入/粘贴 URL 自动成链——保留「手动输入链接」唯一通道
         * （compact 工具栏链接按钮已移除，见下；autolink 产出的 URL 同样过 isAllowedUri 白名单） */
        autolink: true,
        linkOnPaste: true,
        isAllowedUri: (url, ctx) => {
          if (!url) return ctx.defaultValidate(url);
          try {
            const parsed = new URL(url, typeof window !== "undefined" ? window.location.href : "https://yinli.app/");
            return ["http:", "https:", "mailto:"].includes(parsed.protocol);
          } catch {
            return false;
          }
        },
      }),
      Image,
    ],
    content: value ?? "",
    editorProps: {
      attributes: { class: "rich-editor-content" },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const uploading = useRef(false);

  /* 编辑场景预载存量图：galleryPaths（037 新模型有序图集）优先；空则回退正文已有 <img>（旧帖兼容）
   * 预载条目 origin=existing：删除仅标记待删（onRemovedExistingChange），保存成功才清 storage */
  const initialValueRef = useRef(value);
  const initialGalleryRef = useRef(galleryPaths);
  useEffect(() => {
    const fromGallery = initialGalleryRef.current ?? [];
    const fromBody = initialValueRef.current
      ? extractImageUrls(initialValueRef.current)
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

  if (!editor) return <div className="rich-editor min-w-0 max-w-full overflow-hidden rounded-control border border-line bg-surface" aria-label="编辑器加载中" />;

  const uploadingCount = gallery.filter((it) => it.status === "uploading").length;

  /* 工具栏按钮（原 .rich-tool-btn：30×30 圆角 6 透明底；active「on」态主色软底——
   * 原 CSS .on 定义于 :hover 之后同特异性 → active 时悬停不变色，故 on 分支不带 hover 类） */
  const btn = (active: boolean, onClick: () => void, title: string, icon: React.ReactNode) => (
    <button
      type="button"
      className={`flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent p-0 text-muted transition-[background-color,color] duration-[180ms] [font:inherit]${
        active ? " bg-primary-soft text-primary" : " hover:bg-hover hover:text-foreground"
      }`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  );

  /** 图片按钮（upload 凭证存在时显示；上传中禁用） */
  const imageBtn = upload && (
    <button
      type="button"
      className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent p-0 text-muted transition-[background-color,color] duration-[180ms] hover:bg-hover hover:text-foreground"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => fileRef.current?.click()}
      disabled={uploadingCount > 0}
      title="添加图片（可多选，最多 9 张）"
      aria-label="添加图片"
    >
      <ImagePlus size={15} />
    </button>
  );

  /** 链接：prompt 输入（留空清除） */
  function toggleLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("链接地址（https://…），留空取消链接", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  /** 多选图片 → 逐张串行上传（一次一张防配额突刺）→ 进图集条（不自动插入正文） */
  async function onPickImages(files: FileList | null) {
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
    if (fileRef.current) fileRef.current.value = "";
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

  /** 删除图集条目：同步移除正文中同 src 的 <img>；按 origin 决定 storage 清理时机
   *  upload=本次新上传（从未入库，孤儿）→ 立即删 storage
   *  existing=编辑预载的存量图 → 仅标记待删，保存成功才真删（避免取消编辑后 content 回滚仍引用已删文件 → 404） */
  function removeFromGallery(item: GalleryItem) {
    setGallery((g) => g.filter((it) => it.key !== item.key));
    if (item.src) removeImageFromDoc(item.src);
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

  /** 按 src 移除正文中的 <img>（Tiptap 无内置命令，遍历 doc 删除节点） */
  function removeImageFromDoc(src: string) {
    const positions: number[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.src === src) positions.push(pos);
    });
    if (positions.length === 0) return;
    let tr = editor.state.tr;
    for (const pos of positions.reverse()) tr = tr.delete(pos, pos + 1);
    editor.view.dispatch(tr);
  }

  return (
    /* 根保留宿主类 rich-editor（共享排版层 .rich-editor.compact .rich-editor-content 组合选择器用） */
    <div className={`rich-editor min-w-0 max-w-full ${compact ? "relative overflow-visible border-0 bg-transparent" : "overflow-hidden rounded-control border border-line bg-surface"}`}>
      {compact ? (
        /* 轻量模式（2026-08-31 起常显，不再聚焦浮出——更易被发现；点击按钮不夺焦）；
         * 原 .rich-toolbar + .rich-toolbar-compact 双类共存（后者仅覆盖 padding，border/bg 仍在）→ 原子类等效合并 */
        <div className="flex flex-wrap items-center gap-[2px] border-b border-line bg-raised p-[0_0_8px]" role="toolbar" aria-label="文本格式工具栏">
          {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "加粗", <Bold size={15} />)}
          {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "斜体", <Italic size={15} />)}
          {/* 列表：早期固定无序（2026-09-02 文案明示，避免用户误以为可选类型；未来迭代再提供选择） */}
          {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "无序列表", <List size={15} />)}
          {/* 链接按钮已移除（2026-09-02）：正文直接输入/粘贴 URL 自动成链（Link autolink），入口重复不再保留 */}
          {imageBtn}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-[2px] border-b border-line bg-raised p-[6px]" role="toolbar" aria-label="富文本工具栏">
          {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "标题", <Heading2 size={15} />)}
          {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "小标题", <Heading3 size={15} />)}
          {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "加粗", <Bold size={15} />)}
          {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "斜体", <Italic size={15} />)}
          {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "删除线", <Strikethrough size={15} />)}
          {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "无序列表", <List size={15} />)}
          {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "有序列表", <ListOrdered size={15} />)}
          {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "引用", <Quote size={15} />)}
          {btn(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), "代码块", <Code2 size={15} />)}
          {btn(editor.isActive("link"), toggleLink, "链接", <Link2 size={15} />)}
          <button
            type="button"
            className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[6px] border-0 bg-transparent p-0 text-muted transition-[background-color,color] duration-[180ms] hover:bg-hover hover:text-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="分割线"
            aria-label="分割线"
          >
            <Minus size={15} />
          </button>
          {imageBtn}
        </div>
      )}
      {/* 正文容器：EditorContent 必须始终渲染（2026-08-31 回归修复——若按 isEmpty 条件渲染整个容器，
          用户一输入 isEmpty 变 false → 容器卸载 → 编辑区消失且内容丢失）；
          占位文案只是 overlay，按 isEmpty 单独显隐 */}
      <div className="relative">
        {compact && editor.isEmpty && (
          <span className="pointer-events-none absolute left-[2px] top-2 z-0 select-none text-[15px] leading-[1.9] text-soft" aria-hidden="true">分享你发现的好东西，或介绍你的内容…</span>
        )}
        <EditorContent editor={editor} />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(event) => {
          void onPickImages(event.target.files);
        }}
      />

      {/* 图集条（2026-08-31：多图管理区；图片不自动插入正文，编辑区保持干净） */}
      {(gallery.length > 0 || galleryHint) && (
        <div className="mt-[10px] flex items-center gap-2 overflow-x-auto rounded-[10px] border border-dashed border-line p-2" role="list" aria-label="已上传图片">
          {gallery.map((item, i) => (
            <div className="relative h-16 w-16 flex-none overflow-hidden rounded-lg bg-hover" key={item.key} role="listitem">
              {item.src && (
                /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */
                <img src={item.src} alt="" className={`h-full w-full object-cover${item.status === "uploading" ? " opacity-40" : ""}`} />
              )}
              {/* 上传中遮罩：非令牌 rgba 黑底白字，宿主类 rich-gallery-status 由 decor.css ⑨ 承载 */}
              {item.status === "uploading" && <span className="rich-gallery-status">上传中…</span>}
              {item.status === "error" && (
                <span className="absolute inset-0 grid place-items-center bg-surface">
                  <button type="button" className="cursor-pointer rounded-[6px] border border-line bg-transparent px-[10px] py-[3px] text-[11px] text-muted [font:inherit]" onClick={() => void retryUpload(item)}>重试</button>
                </span>
              )}
              {/* 完成态操作条（左移/右移/删除）：非令牌 rgba 黑底白字家族，宿主类 rich-gallery-actions 由 decor.css ⑨ 承载 */}
              {item.status === "done" && (
                <span className="rich-gallery-actions">
                  <button type="button" title="左移" aria-label="左移" disabled={i === 0} onClick={() => moveItem(i, -1)}>
                    <ArrowLeft size={12} />
                  </button>
                  <button type="button" title="右移" aria-label="右移" disabled={i === gallery.length - 1} onClick={() => moveItem(i, 1)}>
                    <ArrowRight size={12} />
                  </button>
                  <button type="button" title="删除" onClick={() => removeFromGallery(item)}>
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          ))}
          {gallery.length < GALLERY_MAX && (
            <button
              type="button"
              className="flex h-16 w-16 flex-none cursor-pointer items-center justify-center rounded-lg border border-dashed border-line-primary bg-transparent p-0 text-primary disabled:cursor-default disabled:opacity-50"
              disabled={uploadingCount > 0}
              onClick={() => fileRef.current?.click()}
              aria-label="继续添加图片"
            >
              <ImagePlus size={14} />
            </button>
          )}
          {galleryHint && <span className="ml-auto whitespace-nowrap pr-1 text-[11px] text-muted">{galleryHint}</span>}
        </div>
      )}
    </div>
  );
}
