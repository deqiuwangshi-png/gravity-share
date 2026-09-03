/**
 * 查询层 · 杂项域（S3 拆分 2026-08-29，自 lib/queries.ts 搬移，零逻辑改动）
 * 公告走马灯 / 外链域名信誉库 / 官方认证申请 / 敏感操作 re-auth
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Announcement } from "@/lib/types";

const ANNOUNCEMENTS = "announcements";
const LINK_DOMAINS = "link_domains";

/* ---------- 019 首页公告（走马灯） ---------- */

type AnnouncementRow = {
  id: string;
  kind: string;
  icon: string | null;
  title: string;
  description: string | null;
  link: string | null;
  image_url: string | null;
};

function toAnnouncementDTO(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    kind: (row.kind as Announcement["kind"]) ?? "notice",
    icon: (row.icon as Announcement["icon"]) ?? undefined,
    title: row.title,
    desc: row.description ?? "",
    link: row.link ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

/** 上架公告（RLS 已过滤 active；时段过滤在查询层，按 sort 排序） */
export async function fetchAnnouncements(supabase: SupabaseClient): Promise<Announcement[]> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from(ANNOUNCEMENTS)
    .select("id, kind, icon, title, description, link, image_url")
    .eq("active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  return (data as AnnouncementRow[] | null)?.map(toAnnouncementDTO) ?? [];
}

/* ---------- 020 安全加固：外链域名信誉库（/go 分级用） ---------- */

/** 域名信誉库（link_domains 表，Table Editor 在线维护；trusted 直跳 / blocked 拦截） */
export async function fetchLinkDomains(supabase: SupabaseClient): Promise<{ trusted: Set<string>; blocked: Set<string> }> {
  const { data } = await supabase.from(LINK_DOMAINS).select("domain, kind");
  const trusted = new Set<string>();
  const blocked = new Set<string>();
  for (const row of (data as Array<{ domain: string; kind: string }> | null) ?? []) {
    if (row.kind === "trusted") trusted.add(row.domain.toLowerCase());
    else if (row.kind === "blocked") blocked.add(row.domain.toLowerCase());
  }
  return { trusted, blocked };
}

/* ---------- 021 官方认证（verifications 申请表，本人读） ---------- */

export type VerificationRow = {
  id: string;
  vtype: "personal" | "organization" | "enterprise";
  statement: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

/** 我的认证申请（RLS 本人读；最新一条在前） */
export async function fetchVerifications(supabase: SupabaseClient): Promise<VerificationRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("verifications")
    .select("id, vtype, statement, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data as VerificationRow[] | null) ?? [];
}

/* ---------- 敏感操作 re-auth（2026-08-29，账号劫持防线） ---------- */

/** 用当前密码验证身份（注销 / 修改密码 / 修改邮箱共用）：
 * signInWithPassword 仅作校验，失败返回 false，成功顺带刷新会话。
 * 若 session 无邮箱（异常态）一律拒绝，宁可不放行。 */
export async function verifyCurrentPassword(supabase: SupabaseClient, password: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return false;
  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
  return !error;
}
