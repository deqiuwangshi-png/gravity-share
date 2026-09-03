/**
 * users 资料域写动作层（2026-09-03，收口 3 组件 4 处内联 users.update——组件职责分层，见 AGENTS.md）：
 * - updateUserProfile：纯字段更新（name / bio 等，无 storage 语义）
 * - saveProfileImage：换头像 / 封面统一动作——写图片列 + BUG-14 收纳（失败回滚新图、成功清旧图）
 * 组件只保留：文件校验/上传（lib/storage）、busy 态、成功回调（setState 刷新）
 * 返回 { ok: boolean }；错误文案与 toast 留在调用方组件层
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { removeImage } from "@/lib/storage";

/** 可写纯字段白名单（避免 Record 泛化放开任意列）；新字段按需在此扩展 */
export type ProfilePatch = {
  name?: string;
  bio?: string;
};

/** 资料图片换图输入（avatar_url / cover_url 共用） */
export type ProfileImageInput = {
  userId: string;
  /** 目标列（与 users 表列对齐） */
  column: "avatar_url" | "cover_url";
  /** storage 桶（与 lib/storage UploadTarget 对齐：avatar / cover） */
  bucket: "avatar" | "cover";
  /** 本次上传成功后的新 path */
  path: string;
  /** 换图前的旧 path（成功且不同才清理） */
  prevPath?: string;
};

/**
 * 纯字段更新（name / bio 等）。返回 { ok: boolean }——写库失败由组件 toast 提示
 */
export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: ProfilePatch,
): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("users").update(patch).eq("id", userId);
  return { ok: !error };
}

/**
 * 换头像 / 封面（BUG-14 收纳，3 组件同款语义唯一实现）：
 * 写 users 图片列 → 失败回滚新图（避免孤儿）→ 成功且旧图不同清理旧图
 * 返回 { ok: boolean }——写库失败为 false（组件 toast），图片清理失败静默
 */
export async function saveProfileImage(
  supabase: SupabaseClient,
  input: ProfileImageInput,
): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from("users")
    .update({ [input.column]: input.path })
    .eq("id", input.userId);
  if (error) {
    /* BUG-14：更新失败回滚新图 */
    void removeImage(input.bucket, input.path).catch(() => {});
    return { ok: false };
  }
  /* BUG-14：换图成功清理旧图（与旧 path 不同才删） */
  if (input.prevPath && input.prevPath !== input.path) {
    void removeImage(input.bucket, input.prevPath).catch(() => {});
  }
  return { ok: true };
}
