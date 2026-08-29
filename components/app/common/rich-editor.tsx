/**
 * 富文本编辑器（2026-08-29，TipTap）——富文本帖发布 / 编辑共用
 * 全量模式：标题 H2/H3、加粗/斜体/删除线、有序/无序列表、引用、代码块、分割线、链接、图片
 * compact 轻量模式（短帖发布，2026-08-29）：仅 B/斜体/列表/链接 4 按钮；
 *   容器透明无边框、工具栏仅在聚焦时于右上角浮出（气泡）、空内容显示占位文案
 * 图片走现有 /api/upload（upload prop 传入 uid + postId 时显示图片按钮，插入完整公开 URL）
 * 输出 HTML（editor.getHTML），提交方存 content；渲染端 sanitize 防 XSS
 */
"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import {
  Bold, Italic, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Minus, Link2, ImagePlus,
} from "lucide-react";
import { publicImageUrl, uploadImage } from "@/lib/storage";

export function RichEditor({
  value,
  onChange,
  upload,
  compact,
}: {
  /** 初始 HTML（编辑场景传入存量内容） */
  value?: string;
  /** 内容变更回调（HTML） */
  onChange: (html: string) => void;
  /** 图片上传凭证（发布/编辑场景提供后显示图片按钮） */
  upload?: { userId: string; postId: string };
  /** 轻量模式（短帖发布）：仅 4 按钮，工具栏聚焦时浮出，透明无边框 */
  compact?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const editor = useEditor({
    /* Link 协议白名单（2026-08-29）：编辑器入口即拒绝 javascript:/data: 等危险协议，
     * 与渲染端 sanitizeHtmlForRender 的 URI 白名单形成双保险 */
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
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
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const uploading = useRef(false);

  if (!editor) return <div className="rich-editor" aria-label="编辑器加载中" />;

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

  /** 图片：上传（复用 /api/upload 魔术字节校验）→ 插入完整公开 URL */
  async function onPickImage(file: File) {
    if (!upload || uploading.current) return;
    uploading.current = true;
    try {
      const path = await uploadImage("post", file, upload.userId, upload.postId);
      const url = publicImageUrl("post", path);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      /* 上传失败静默，不打断输入 */
    }
    uploading.current = false;
    if (fileRef.current) fileRef.current.value = "";
  }

  const btn = (active: boolean, onClick: () => void, title: string, icon: React.ReactNode) => (
    <button
      type="button"
      className={`rich-tool-btn${active ? " on" : ""}`}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {icon}
    </button>
  );

  return (
    <div className={`rich-editor${compact ? " compact" : ""}`}>
      {compact ? (
        /* 轻量模式：聚焦时右上角浮出迷你工具栏（点击按钮不夺焦，onMouseDown preventDefault 保证不触发 blur） */
        focused && (
          <div className="rich-toolbar rich-toolbar-compact" role="toolbar" aria-label="文本格式工具栏">
            {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "加粗", <Bold size={15} />)}
            {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "斜体", <Italic size={15} />)}
            {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "列表", <List size={15} />)}
            {btn(editor.isActive("link"), toggleLink, "链接", <Link2 size={15} />)}
          </div>
        )
      ) : (
        <div className="rich-toolbar" role="toolbar" aria-label="富文本工具栏">
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
            className="rich-tool-btn"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="分割线"
            aria-label="分割线"
          >
            <Minus size={15} />
          </button>
          {upload && (
            <button
              type="button"
              className="rich-tool-btn"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => fileRef.current?.click()}
              title="插入图片"
              aria-label="插入图片"
            >
              <ImagePlus size={15} />
            </button>
          )}
        </div>
      )}
      {/* 轻量模式占位文案（TipTap 无内置 placeholder 扩展，零依赖用 isEmpty 判断） */}
      {compact && editor.isEmpty && (
        <span className="rich-placeholder" aria-hidden="true">分享你发现的好东西，或介绍你的内容…（可加 #标签）</span>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onPickImage(file);
        }}
      />
      <EditorContent editor={editor} />
    </div>
  );
}
