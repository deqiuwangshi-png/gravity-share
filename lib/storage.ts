/**
 * 图片存储工具（S-1 起）：校验 / 上传 / 公开 URL
 * 桶：avatars（头像）/ covers（封面）/ posts（广场原创配图）
 * 2026-08-23 安全加固（V1）：上传改走 /api/upload（服务端魔术字节 + 大小强制），
 * 客户端不再直传 storage——服务端返回 path，本函数保持原签名（调用方零改动）。
 * 表里存存储 path（非完整 URL），展示时 publicImageUrl 拼接
 */
import { createClient } from "@/lib/supabase/client";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

export type UploadTarget = "avatar" | "cover" | "post";

function bucketOf(target: UploadTarget): string {
  return target === "avatar" ? "avatars" : target === "cover" ? "covers" : "posts";
}

/** 前端校验：返回错误文案（null = 通过）；服务端 /api/upload 会再次强制（魔术字节/大小） */
export function validateImage(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "仅支持 JPG / PNG / WebP / GIF 图片";
  if (file.size > MAX_SIZE) return "图片不能超过 5MB";
  return null;
}

/**
 * 上传图片（经 /api/upload 服务端校验），返回存储 path（如 avatars/{uid}/{stamp}.jpg）
 * 失败抛错（调用方展示文案）；post 图需要 postId（posts/{uid}/{postId}/…）
 */
export async function uploadImage(
  target: UploadTarget,
  file: File,
  _userId: string,
  postId?: string,
): Promise<string> {
  const body = new FormData();
  body.append("target", target);
  body.append("file", file);
  if (postId) body.append("postId", postId);
  const res = await fetch("/api/upload", { method: "POST", body });
  if (!res.ok) throw new Error("上传失败，请重试");
  const data = (await res.json()) as { path?: string };
  if (!data.path) throw new Error("上传失败，请重试");
  return data.path;
}

/** 存储 path → 公开 URL（BUG-6 纯函数化：不再依赖浏览器 client，server/client 通用） */
export function publicImageUrl(target: UploadTarget, path: string): string {
  /* 第三方登录头像为外部 URL（OAuth provider 写入 users.avatar_url），原样返回 */
  if (path.startsWith("http")) return path;
  /* path 格式受控：{uid}/{stamp}.{ext}（posts 为 {uid}/{postId}/{stamp}.{ext}），无特殊字符 */
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucketOf(target)}/${path}`;
}

/** 删除存储对象（BUG-14：孤儿文件回滚 / 换图后旧图清理） */
export async function removeImage(target: UploadTarget, path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(bucketOf(target)).remove([path]);
}
