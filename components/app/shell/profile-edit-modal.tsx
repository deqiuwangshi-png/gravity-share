/**
 * 个人主页「编辑个人资料」弹窗（client，2026-08-23）——资料编辑主入口（迁移自用户设置）
 * 承载：头像（选文件即上传，BUG-14 回滚/清旧图）+ 昵称（保存时更新）
 * 用户设置「用户设置」tab 保留：邮箱 / 简介 / 加入时间（简介仍在设置里编辑）
 * 封面编辑在主页（profile-view 的「更换封面」），与本弹窗无重复
 */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { removeImage, safeAvatarUrl, uploadImage, validateImage } from "@/lib/storage";
import { useToast } from "@/components/app/common/toast";

export function ProfileEditModal({
  name,
  avatarUrl,
  userId,
  onClose,
  onSaved,
}: {
  name: string;
  avatarUrl: string;
  userId: string;
  onClose: () => void;
  /** 保存成功后通知父级刷新（新昵称/新头像） */
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(name);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { show } = useToast();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** 头像：选中即上传并落库（同 settings 逻辑，BUG-14 换图清旧图） */
  async function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || avatarBusy) return;
    const invalid = validateImage(file);
    if (invalid) {
      setAvatarError(invalid);
      return;
    }
    setAvatarError("");
    setAvatarBusy(true);
    try {
      const path = await uploadImage("avatar", file, userId);
      const { error: saveError } = await createClient().from("users").update({ avatar_url: path }).eq("id", userId);
      if (saveError) {
        void removeImage("avatar", path);
        setAvatarError("保存失败，请重试");
        return;
      }
      if (avatar && avatar !== path) void removeImage("avatar", avatar);
      setAvatar(path);
    } catch {
      setAvatarError("上传失败，请重试");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function save() {
    const value = displayName.trim();
    if (!value) {
      setError("昵称不能为空");
      return;
    }
    if (saving) return;
    setSaving(true);
    setError("");
    const { error: saveError } = await createClient().from("users").update({ name: value }).eq("id", userId);
    setSaving(false);
    if (saveError) {
      setError("保存失败，请稍后重试");
      return;
    }
    show("已保存");
    onSaved();
    onClose();
  }

  return (
    <div className="app-modal profile-edit-overlay" onClick={onClose}>
      <div className="profile-edit-modal" onClick={(event) => event.stopPropagation()}>
        <header className="profile-edit-head">
          <h3>编辑个人资料</h3>
          <button type="button" className="settings-close" onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className="profile-edit-body">
          <div className="settings-row">
            <span className="settings-row-label">头像</span>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- 用户上传图
              <img className="settings-avatar-img" src={safeAvatarUrl(avatar)} alt="头像" />
            ) : (
              <span className="settings-avatar-fallback">{displayName.charAt(0).toUpperCase()}</span>
            )}
            <input
              id="profile-edit-avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => void onAvatarChange(event)}
            />
            <label className="settings-row-action" htmlFor="profile-edit-avatar" role="button">
              {avatarBusy ? "上传中…" : "修改"}
            </label>
          </div>
          {avatarError && <p className="settings-edit-error">{avatarError}</p>}

          <div className="settings-row">
            <span className="settings-row-label">昵称</span>
            <input
              className="settings-input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void save();
              }}
              maxLength={24}
              autoFocus
            />
          </div>
          {error && <p className="settings-edit-error">{error}</p>}
        </div>

        <footer className="profile-edit-foot">
          <button type="button" onClick={onClose} disabled={saving}>取消</button>
          <button type="button" className="save" onClick={() => void save()} disabled={saving || !displayName.trim()}>
            {saving ? "保存中…" : "保存"}
          </button>
        </footer>
      </div>
    </div>
  );
}
