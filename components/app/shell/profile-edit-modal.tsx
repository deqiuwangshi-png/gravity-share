/**
 * 个人主页「编辑个人资料」弹窗（client，2026-08-23）——资料编辑主入口（迁移自用户设置）
 * 承载：头像（选文件即上传，BUG-14 回滚/清旧图）+ 昵称（保存时更新）
 * 用户设置「用户设置」tab 保留：邮箱 / 简介 / 加入时间（简介仍在设置里编辑）
 * 封面编辑在主页（profile-view 的「更换封面」），与本弹窗无重复
 * 2026-09-02 迁移：profile-edit-* 框架 + settings-* 行控件原子类化
 * 2026-09-03 P1 重构：自研遮罩 + Esc effect → Radix Dialog 组合（ui/dialog）：
 *  - Esc / 点遮罩关闭 / 焦点圈定由 Dialog 托管；行控件视觉 1:1 保留
 *  - 昵称输入换通用 Input（ui/input，同串来源）；行内布局类（ml-auto/flex-1/max-w）留在消费方
 *  - profile-edit-modal 宿主类仍承载 decor.css 阴影；overlay grid 居中/padding24 随自研壳删除
 *    （Radix Content 自身居中，decor ⑤ .profile-edit-overlay 规则同步清理）
 */
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeAvatarUrl, uploadImage, validateImage } from "@/lib/storage";
import { saveProfileImage, updateUserProfile } from "@/lib/user-actions";
import { useToast } from "@/components/app/common/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldRow } from "@/components/ui/field-row";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

/* 行控件（2026-09-03 P3：rowClass/rowLabelClass/errClass 收编 ui/field-row；
 * rowActionClass 文字操作钮与官方 Button link 语义交叠，待评估后收编，暂留本文件） */
const rowActionClass = "shrink-0 cursor-pointer border-0 bg-transparent text-[13px] font-medium text-primary [font:inherit]";

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
      /* 写库 + BUG-14 回滚/清旧图收纳于 lib/user-actions.saveProfileImage */
      const { ok } = await saveProfileImage(createClient(), { userId, column: "avatar_url", bucket: "avatar", path, prevPath: avatar });
      if (!ok) {
        setAvatarError("保存失败，请重试");
        return;
      }
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
    const { ok } = await updateUserProfile(createClient(), userId, { name: value });
    setSaving(false);
    if (!ok) {
      setError("保存失败，请稍后重试");
      return;
    }
    show("已保存");
    onSaved();
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="profile-edit-modal w-[min(420px,calc(100%-2rem))] overflow-hidden rounded-[14px] bg-background"
        onOpenAutoFocus={(event) => event.preventDefault() /* 放行下方昵称输入 autoFocus */}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-[14px]">
          <DialogTitle className="m-0 text-[15px]">编辑个人资料</DialogTitle>
          <DialogClose asChild>
            <button type="button" className="cursor-pointer border-0 bg-transparent p-1 text-[18px] text-soft" aria-label="关闭">×</button>
          </DialogClose>
        </header>

        <div className="grid gap-1 px-5 py-[18px]">
          <FieldRow label="头像" error={avatarError}>
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
          </FieldRow>

          <FieldRow label="昵称" error={error}>
            <Input
              className="ml-auto max-w-[220px] min-w-0 flex-1"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void save();
              }}
              maxLength={24}
              autoFocus
            />
          </FieldRow>
        </div>

        <footer className="flex justify-end gap-2 border-t border-line px-5 py-[14px]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => void save()}
            disabled={saving || !displayName.trim()}
          >
            {saving ? "保存中…" : "保存"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
