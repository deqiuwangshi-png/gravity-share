/**
 * square_posts 写动作层（2026-09-03，收口 publish-modal insert 与 square-post-edit-form update
 * 两处内联直写——组件职责分层，见 AGENTS.md）：
 * - createSquarePost：组装 + insert square_posts（sanitize 主防线 / 封面=图集第 1 张）+ 失败孤儿图回滚
 * - updateSquarePost：sanitize/stripImages 统一图片模型 + update + 失败回滚新图 / 成功清旧封面与已删存量
 * 两动作共享与发布端一致的图片/清洗语义——发布与编辑不再各自漂移
 * 组件保留：表单校验（标题/空/字数）、busy 态、成功编排（事件分发 / onDone / 跳转）
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { SQUARE_POST_TYPES } from "@/lib/config";
import { extractTags, stripHtml } from "@/lib/text";
import { isRichText, sanitizeHtml, stripImages } from "@/lib/rich-content";
import { removeImage } from "@/lib/storage";

/** 新帖统一 post_type = SQUARE_POST_TYPES[0]（存量 opportunity/content 帖保留渲染，015 库字段不变） */
const [PT_SHARE] = SQUARE_POST_TYPES;

export type CreateSquarePostInput = {
  /** 防重复短 id（弹窗级 draftId） */
  id: string;
  authorId: string;
  /** 富文本 HTML 原文（组件已过空/字数校验；sanitize 主防线在此统一做） */
  html: string;
  title: string;
  category: string;
  /** 图集 storage path 数组（第 1 张 = 封面 image_url） */
  galleryPaths: string[];
};

/**
 * 发布新帖：组装 payload（tags 从纯文本提炼 / url 恒 null——链接统一由正文 <a> 承载）
 * → insert → 失败回滚本次上传的全部图片（BUG-14，防孤儿文件）。
 * 返回 { ok: boolean }——写库失败为 false（组件 toast）
 */
export async function createSquarePost(
  supabase: SupabaseClient,
  input: CreateSquarePostInput,
): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("square_posts").insert({
    id: input.id,
    author_id: input.authorId,
    content: sanitizeHtml(input.html),
    title: input.title.trim(),
    category: input.category,
    tags: extractTags(stripHtml(input.html)),
    url: null,
    image_url: input.galleryPaths[0] ?? null,
    gallery: input.galleryPaths,
    post_type: PT_SHARE,
  });
  if (error) {
    input.galleryPaths.forEach((path) => void removeImage("post", path).catch(() => {}));
    return { ok: false };
  }
  return { ok: true };
}

export type UpdateSquarePostInput = {
  postId: string;
  /** 正文原文（富文本 HTML 或纯文本；是否富文本由内容形态自判） */
  content: string;
  title: string;
  category: string;
  /** 新图集全集（编辑态下 = 存量图 + 新上传 - 已删） */
  galleryPaths: string[];
  /** 原封面 path（用于封面变更后清理旧图） */
  prevImageUrl: string | null;
  /** 打开编辑时的存量图集合（含正文存量图；判定「本次新上传孤儿」用） */
  existingPaths: Set<string>;
  /** 用户删除的存量图（保存成功才真正删 storage——延迟删除防取消后 content 回滚引用 404） */
  deletedExisting: string[];
};

/**
 * 保存编辑：统一图片模型（富文本 sanitize + stripImages 剥离正文 img，封面 = 图集第 1 张，
 * 图集空且原封面未删则保留原封面，否则置空防回退到已删文件 → 404）→ update
 * → 失败回滚本次新上传孤儿图；成功清旧封面（变更时）+ 延迟删用户已删的存量图。
 * 返回 { ok: boolean }
 */
export async function updateSquarePost(
  supabase: SupabaseClient,
  input: UpdateSquarePostInput,
): Promise<{ ok: boolean }> {
  const isRich = isRichText(input.content);
  const nextImage: string | null =
    input.galleryPaths[0] ??
    (input.prevImageUrl && !input.deletedExisting.includes(input.prevImageUrl)
      ? input.prevImageUrl
      : null);
  const { error } = await supabase
    .from("square_posts")
    .update({
      content: isRich ? stripImages(sanitizeHtml(input.content)) : input.content.trim(),
      title: input.title.trim(),
      image_url: nextImage,
      gallery: input.galleryPaths,
      category: input.category,
    })
    .eq("id", input.postId);
  if (error) {
    /* 回滚本次新上传的孤儿图（仅 upload，存量图不动——保存失败数据库未变，仍引用这些图） */
    input.galleryPaths
      .filter((path) => !input.existingPaths.has(path))
      .forEach((path) => void removeImage("post", path).catch(() => {}));
    return { ok: false };
  }
  /* 封面变更：清理旧封面图 */
  if (input.prevImageUrl && input.prevImageUrl !== nextImage) {
    void removeImage("post", input.prevImageUrl);
  }
  /* 保存成功：清理被删除的存量图（延迟删除语义随动作收口） */
  input.deletedExisting.forEach((path) => void removeImage("post", path).catch(() => {}));
  return { ok: true };
}
