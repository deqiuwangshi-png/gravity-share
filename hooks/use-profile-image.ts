/**
 * useProfileImage —— 资料图（头像/封面）上传 hook（2026-09-03，自 profile-view 封面 + profile-edit-modal
 * 头像两处同款编排抽离合并——组件职责分层，见 AGENTS.md）：
 * 流程：校验（validateImage）→ 上传（uploadImage，经 /api/upload 服务端强制校验）→
 * 写库（lib/user-actions.saveProfileImage，BUG-14 失败回滚/成功清旧图收纳其中）
 * 参数化 column/bucket（avatar_url/avatars 或 cover_url/covers），两处共用一套状态机
 * 组件只保留：预览图渲染 + busy/error 文案 + 触发按钮
 */
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, validateImage } from "@/lib/storage";
import { saveProfileImage } from "@/lib/user-actions";

/** 资料图字段配置（column/bucket 二选一配对；不 export——仅本 hook 参数签名使用） */
type ProfileImageField = {
  /** 目标列（users 表） */
  column: "avatar_url" | "cover_url";
  /** storage 桶目标（lib/storage UploadTarget 的子集） */
  bucket: "avatar" | "cover";
  userId: string;
  /** 当前展示图 path（作换图时的 prevPath，成功且不同才清旧图） */
  currentPath: string;
  /** 是否允许操作（false = 他人主页只读，不响应选文件） */
  enabled?: boolean;
};

export function useProfileImage({ column, bucket, userId, currentPath, enabled = true }: ProfileImageField) {
  const [path, setPath] = useState(currentPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /** 选中文件即上传并落库；当前图随 success 更新，外部通过 path 渲染 */
  async function change(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !enabled || busy) return;
    const invalid = validateImage(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    setBusy(true);
    try {
      const next = await uploadImage(bucket, file, userId);
      /* 写库 + BUG-14 回滚/清旧图收纳于 lib/user-actions.saveProfileImage */
      const { ok } = await saveProfileImage(createClient(), {
        userId,
        column,
        bucket,
        path: next,
        prevPath: path,
      });
      if (!ok) {
        setError("保存失败，请重试");
        return;
      }
      setPath(next);
    } catch {
      setError("上传失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return { path, busy, error, change };
}
