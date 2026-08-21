/**
 * 图片存储工具（S-1 起）：校验 / 上传 / 公开 URL
 * 桶：avatars（头像）/ covers（封面）/ posts（广场原创配图）
 * 公开桶 + 随机文件名（防枚举）；storage.objects RLS 服务端强制（目录绑定 uid + MIME + 大小）
 * 表里存存储 path（非完整 URL），展示时 publicImageUrl 拼接
 */
import { createClient } from "@/lib/supabase/client";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

export type UploadTarget = "avatar" | "cover" | "post";

function bucketOf(target: UploadTarget): string {
  return target === "avatar" ? "avatars" : target === "cover" ? "covers" : "posts";
}

/** 前端校验：返回错误文案（null = 通过）；服务端 storage RLS 会再次强制 */
export function validateImage(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "仅支持 JPG / PNG / WebP / GIF 图片";
  if (file.size > MAX_SIZE) return "图片不能超过 5MB";
  return null;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/**
 * 上传图片，返回存储 path（如 avatars/{uid}/{stamp}.jpg）；失败抛错（调用方展示文案）
 * post 图需要 postId（posts/{uid}/{postId}/{stamp}.jpg），先定 id 再传图
 */
export async function uploadImage(
  target: UploadTarget,
  file: File,
  userId: string,
  postId?: string,
): Promise<string> {
  const supabase = createClient();
  const bucket = bucketOf(target);
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const stamp = `${Date.now().toString(36)}-${randomSuffix()}`;
  const path = target === "post" ? `${userId}/${postId}/${stamp}.${ext}` : `${userId}/${stamp}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
  });
  if (error) throw new Error("上传失败，请重试");
  return path;
}

/** 存储 path → 公开 URL */
export function publicImageUrl(target: UploadTarget, path: string): string {
  const supabase = createClient();
  return supabase.storage.from(bucketOf(target)).getPublicUrl(path).data.publicUrl;
}
