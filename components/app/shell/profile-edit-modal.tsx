/**
 * 个人主页「编辑个人资料」弹窗（client，2026-08-23）——资料编辑主入口（迁移自用户设置）
 * 承载：头像（选文件即上传，BUG-14 回滚/清旧图）+ 昵称（保存时更新）
 * 用户设置「用户设置」tab 保留：邮箱 / 简介 / 加入时间（简介仍在设置里编辑）
 * 封面编辑在主页（profile-view 的「更换封面」），与本弹窗无重复
 * 2026-09-02 迁移：profile-edit-* 框架 + settings-* 行控件原子类化
 * （原 styles/app/profile.css 与 settings.css；行控件与 SettingsPanel 同款，见下方常量）；
 * 遮罩壳/面板阴影见 styles/app/decor.css ⑤
 */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { removeImage, safeAvatarUrl, uploadImage, validateImage } from "@/lib/storage";
import { useToast } from "@/components/app/common/toast";
import { Button } from "@/components/ui/button";

/* 行控件（原 settings.css .settings-row 族，2026-09-02 原子类化，与 SettingsPanel 同款；[font:inherit] 保真） */
const rowClass = "flex min-h-[56px] items-center justify-between gap-4 border-b border-line py-4 last:border-0";
const rowLabelClass = "text-[13px] text-foreground";
const rowActionClass = "shrink-0 cursor-pointer border-0 bg-transparent text-[13px] font-medium text-primary [font:inherit]";
const errClass = "-mt-1 mb-2.5 text-xs text-error";
const inputClass =
  "ml-auto max-w-[220px] min-w-0 flex-1 rounded-lg border border-line bg-surface p-[7px_10px] text-[13px] text-foreground outline-none focus:border-line-primary [font:inherit]";

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
    /* 遮罩壳（grid 居中覆盖）见 decor.css；点击遮罩关闭 */
    <div className="app-modal profile-edit-overlay" onClick={onClose}>
      <div className="profile-edit-modal w-[min(420px,100%)] overflow-hidden rounded-[14px] bg-background" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line px-5 py-[14px]">
          <h3 className="m-0 text-[15px]">编辑个人资料</h3>
          <button type="button" className="cursor-pointer border-0 bg-transparent p-1 text-[18px] text-soft" onClick={onClose} aria-label="关闭">×</button>
        </header>

        <div className="grid gap-1 px-5 py-[18px]">
          <div className={rowClass}>
            <span className={rowLabelClass}>头像</span>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- 用户上传图
              <img className="ml-auto size-[34px] rounded-full bg-hover object-cover" src={safeAvatarUrl(avatar)} alt="头像" />
            ) : (
              <span className="ml-auto grid size-[34px] place-items-center rounded-full bg-primary-soft text-[13px] font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
            )}
            <input
              id="profile-edit-avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => void onAvatarChange(event)}
            />
            <label className={rowActionClass} htmlFor="profile-edit-avatar" role="button">
              {avatarBusy ? "上传中…" : "修改"}
            </label>
          </div>
          {avatarError && <p className={errClass}>{avatarError}</p>}

          <div className={rowClass}>
            <span className={rowLabelClass}>昵称</span>
            <input
              className={inputClass}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void save();
              }}
              maxLength={24}
              autoFocus
            />
          </div>
          {error && <p className={errClass}>{error}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-line px-5 py-[14px]">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void save()}
            disabled={saving || !displayName.trim()}
          >
            {saving ? "保存中…" : "保存"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
