/**
 * 图片存储工具（S-1 起）：校验 / 上传 / 公开 URL
 * 桶：avatars（头像）/ covers（封面）/ posts（广场原创配图）/ announcements（公告海报，运营配置）
 * 2026-08-23 安全加固（V1）：上传改走 /api/upload（服务端魔术字节 + 大小强制），
 * 客户端不再直传 storage——服务端返回 path，本函数保持原签名（调用方零改动）。
 * 表里存存储 path（非完整 URL），展示时 publicImageUrl 拼接
 */
import { createClient } from "@/lib/supabase/client";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

export type UploadTarget = "avatar" | "cover" | "post" | "announcements";

function bucketOf(target: UploadTarget): string {
  if (target === "avatar") return "avatars";
  if (target === "cover") return "covers";
  if (target === "post") return "posts";
  return "announcements";
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

/** 公开 URL → 存储 path（publicImageUrl 的反函数，仅 posts 桶用于编辑时图集预载存量图）
 * 非本桶公开 URL / 外链返回 null（不预载，避免误删他人文件） */
export function pathFromPublicUrl(url: string): string | null {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/posts/`;
  if (!url.startsWith(base)) return null;
  const path = url.slice(base.length).split("?")[0];
  return path || null;
}

/* 头像外部 URL 白名单（OAuth provider 图床域名）——防第三方用头像追踪浏览者 IP（审计 P1）
 * users.avatar_url 用户可自改为任意 http URL，非白名单一律回退首字母渲染 */
const AVATAR_TRUSTED_HOSTS = ["githubusercontent.com", "googleusercontent.com", "gravatar.com"];

function isTrustedAvatarHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return AVATAR_TRUSTED_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/** 头像安全 URL：storage path 正常拼接；OAuth 外链仅白名单图床直出，其余返回空串（渲染层回退首字母） */
export function safeAvatarUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return isTrustedAvatarHost(path) ? path : "";
  return publicImageUrl("avatar", path);
}

/** 封面安全 URL（审计 P1，2026-09-02）：封面无第三方来源（仅本地上传，path 形如 {uid}/{stamp}.ext），
 * 任何 http 外链一律拒绝——users.cover_url 可被直写为任意外链，若原样进 backgroundImage，
 * 每位访客浏览器会向攻击者服务器发请求（泄露 IP/UA/Referer）。返回空串 = 渲染层不设封面（背景色兜底）。 */
export function safeCoverUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return "";
  return publicImageUrl("cover", path);
}

/** 删除存储对象（BUG-14：孤儿文件回滚 / 换图后旧图清理） */
export async function removeImage(target: UploadTarget, path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(bucketOf(target)).remove([path]);
}
