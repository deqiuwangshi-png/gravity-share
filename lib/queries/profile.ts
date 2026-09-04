/**
 * 查询层 · 我的档案（2026-09-04 自 user-menu 抽出，settings-panel 后续接入）
 * 原先 user-menu 读 users(name, avatar_url)、settings-panel 读 users(bio, created_at, uid)——
 * 同一张表两套查询，现统一于此；昵称回退链与 joined（注册月份）派生也收口在查询层，不在组件里散落。
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type MyProfile = {
  id: string;
  /** 展示用昵称（回退链：users.name → user_metadata.name → 邮箱前缀 → 「引力用户」） */
  name: string;
  avatarUrl: string;
  bio: string;
  /** 注册月份 YYYY-MM（created_at 前 7 位） */
  joined: string;
  /** 对外标识 GR + 8 位（046 迁移） */
  uid: string;
  email: string;
};

const FALLBACK_NAME = "引力用户";

type ProfileRow = {
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string | null;
  uid: string | null;
};

/** 我的档案；未登录返回 null（调用方据此判定登录态） */
export async function fetchMyProfile(supabase: SupabaseClient): Promise<MyProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("name, avatar_url, bio, created_at, uid")
    .eq("id", user.id)
    .maybeSingle();
  const row = data as ProfileRow | null;

  /* 2a：昵称以 public.users 为权威，逐级回退到 auth 元数据与邮箱前缀 */
  const name =
    row?.name ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split("@")[0] ||
    FALLBACK_NAME;

  return {
    id: user.id,
    name,
    avatarUrl: row?.avatar_url ?? "",
    bio: row?.bio ?? "",
    joined: row?.created_at?.slice(0, 7) ?? "",
    uid: row?.uid ?? "",
    email: user.email ?? "",
  };
}
