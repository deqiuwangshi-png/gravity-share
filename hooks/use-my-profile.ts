/**
 * 我的档案 hook（2026-09-04 自 user-menu 抽离——组件职责分层，见 AGENTS.md）
 * - authed: boolean | null —— null = 登录态未确定（沿用原行为：避免游客闪现菜单）
 * - profile: 昵称 / 头像 / 简介 / 注册月份 / 对外标识（回退链与派生在 lib/queries/profile）
 * 沿用原实现的失败语义：查询失败不改变登录态，避免网络抖动把已登录用户显示成游客。
 */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchMyProfile, type MyProfile } from "@/lib/queries/profile";

export function useMyProfile() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchMyProfile(createClient()).then((p) => {
      setProfile(p);
      setAuthed(p !== null);
    });
  }, []);

  /** 写库成功后就地更新档案（如 settings-panel 保存简介），免去重新拉取 */
  function patchProfile(patch: Partial<MyProfile>) {
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  return { profile, authed, patchProfile };
}
