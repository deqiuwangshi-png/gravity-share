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
