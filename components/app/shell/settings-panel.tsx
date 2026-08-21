"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { publicImageUrl, uploadImage, validateImage } from "@/lib/storage";

export type PanelId = "settings" | "help";

const NAV_ITEMS = [
  ["用户设置", "settings"],
  ["帮助与反馈", "help"],
] as const satisfies ReadonlyArray<readonly [string, PanelId]>;

/** 键值操作行：名称（左）| 当前值（灰）| 操作按钮（右）；onAction 存在时为真实按钮，否则为占位 */
function SettingRow({
  label,
  value,
  action,
  onAction,
}: {
  label: string;
  value?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="settings-row">
      <span className="settings-row-label">{label}</span>
      {value && <span className="settings-row-value">{value}</span>}
      {action && (
        <button
          type="button"
          className="settings-row-action"
          data-placeholder={onAction ? undefined : ""}
          onClick={onAction}
        >
          {action}
        </button>
      )}
    </div>
  );
}

/**
 * 设置面板（下拉菜单弹出）：用户设置 / 帮助与反馈
 * 用户设置数据源：public.users（2a 起为权威）+ session.user（邮箱）
 * 昵称/简介行内编辑 → update public.users（RLS 自写）
 */
export function SettingsPanel({ initialTab, onClose }: { initialTab: PanelId; onClose: () => void }) {
  const [tab, setTab] = useState<PanelId>(initialTab);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [joined, setJoined] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [editing, setEditing] = useState<"name" | "bio" | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      setEmail(u.email ?? "");
      const { data: profile } = await supabase
        .from("users")
        .select("name, bio, created_at, avatar_url")
        .eq("id", u.id)
        .maybeSingle();
      setName(
        (profile?.name as string) ||
          (u.user_metadata?.name as string) ||
          u.email?.split("@")[0] ||
          "引力用户",
      );
      setBio((profile?.bio as string) ?? "");
      setJoined((profile?.created_at as string)?.slice(0, 7) ?? "");
      setAvatarUrl((profile?.avatar_url as string) ?? "");
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function startEdit(field: "name" | "bio") {
    setEditing(field);
    setDraft(field === "name" ? name : bio);
    setError("");
  }

  async function saveEdit() {
    if (!userId || !editing) return;
    const value = editing === "name" ? draft.trim() : draft;
    if (editing === "name" && !value) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const patch = editing === "name" ? { name: value } : { bio: value };
    const { error: saveError } = await supabase.from("users").update(patch).eq("id", userId);
    setSaving(false);
    if (saveError) {
      setError("保存失败，请稍后重试");
      return;
    }
    if (editing === "name") setName(value);
    else setBio(value);
    setEditing(null);
  }

  /** 头像上传（S-1）：校验 → storage → update users.avatar_url */
  async function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId) return;
    const invalid = validateImage(file);
    if (invalid) {
      setAvatarError(invalid);
      return;
    }
    setAvatarError("");
    setAvatarUploading(true);
    try {
      const path = await uploadImage("avatar", file, userId);
      const { error: saveError } = await createClient().from("users").update({ avatar_url: path }).eq("id", userId);
      if (saveError) {
        setAvatarError("保存失败，请重试");
        return;
      }
      setAvatarUrl(path);
    } catch {
      setAvatarError("上传失败，请重试");
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="app-modal settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <aside className="settings-nav">
          {NAV_ITEMS.map(([label, id]) => (
            <button
              key={id}
              type="button"
              className={`settings-nav-item${tab === id ? " active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
          <div className="settings-side">
            <strong>创作者计划</strong>
            <small>Lv.1 · 距离 Lv.2 还差 2 篇发布</small>
            <div className="settings-progress"><i style={{ width: "60%" }} /></div>
          </div>
        </aside>
        <section className="settings-content">
          <header className="settings-header">
            <h2>{NAV_ITEMS.find(([, id]) => id === tab)![0]}</h2>
            <button type="button" className="settings-close" onClick={onClose} aria-label="关闭">×</button>
          </header>
          <div className="settings-body">
            {tab === "settings" && (
              <>
                <h3 className="settings-group">个人资料</h3>
                <div className="settings-row">
                  <span className="settings-row-label">头像</span>
                  {avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图 */
                    <img className="settings-avatar-img" src={publicImageUrl("avatar", avatarUrl)} alt="头像" />
                  ) : (
                    <span className="settings-avatar-fallback">{name.charAt(0).toUpperCase()}</span>
                  )}
                  <input
                    id="avatar-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    onChange={(event) => void onAvatarChange(event)}
                  />
                  <label className="settings-row-action" htmlFor="avatar-file" role="button">
                    {avatarUploading ? "上传中…" : "修改"}
                  </label>
                </div>
                {avatarError && <p className="settings-edit-error">{avatarError}</p>}
                {editing === "name" ? (
                  <div className="settings-edit">
                    <div className="settings-row">
                      <span className="settings-row-label">昵称</span>
                      <input
                        className="settings-input"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveEdit();
                        }}
                        autoFocus
                        maxLength={24}
                      />
                      <div className="settings-row-actions">
                        <button type="button" onClick={() => setEditing(null)} disabled={saving}>取消</button>
                        <button type="button" className="save" onClick={() => void saveEdit()} disabled={saving || !draft.trim()}>
                          {saving ? "保存中…" : "保存"}
                        </button>
                      </div>
                    </div>
                    {error && <p className="settings-edit-error">{error}</p>}
                  </div>
                ) : (
                  <SettingRow label="昵称" value={name} action="修改" onAction={() => startEdit("name")} />
                )}
                <SettingRow label="邮箱" value={email || "未设置"} action="修改" />
                {editing === "bio" ? (
                  <div className="settings-edit">
                    <div className="settings-row">
                      <span className="settings-row-label">简介</span>
                      <input
                        className="settings-input"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveEdit();
                        }}
                        autoFocus
                        maxLength={80}
                        placeholder="一句话介绍自己（可留空）"
                      />
                      <div className="settings-row-actions">
                        <button type="button" onClick={() => setEditing(null)} disabled={saving}>取消</button>
                        <button type="button" className="save" onClick={() => void saveEdit()} disabled={saving}>
                          {saving ? "保存中…" : "保存"}
                        </button>
                      </div>
                    </div>
                    {error && <p className="settings-edit-error">{error}</p>}
                  </div>
                ) : (
                  <SettingRow label="简介" value={bio || "未填写"} action="编辑" onAction={() => startEdit("bio")} />
                )}
                <SettingRow label="加入时间" value={joined || "—"} />
                <h3 className="settings-group">账户安全</h3>
                <SettingRow label="修改密码" value="通过验证邮件重置" action="修改" />
                <SettingRow label="登录设备" value="由 Supabase 管理" action="管理" />
                <SettingRow label="两步验证" value="未开启" action="开启" />
                <div className="settings-row danger">
                  <span className="settings-row-label">永久删除账号</span>
                </div>
              </>
            )}
            {tab === "help" && (
              <>
                <SettingRow label="如何开始使用引力？" action="查看" />
                <SettingRow label="引力和原平台是什么关系？" action="查看" />
                <SettingRow label="有收费计划吗？" action="查看" />
                <div className="settings-row">
                  <span className="settings-row-label">查看完整帮助</span>
                  <Link className="settings-row-action" href="/help">前往</Link>
                </div>
                <div className="settings-feedback">
                  <h3>反馈意见</h3>
                  <textarea placeholder="告诉我们你的想法或遇到的问题…" rows={3} />
                  <input type="text" placeholder="联系方式（选填）" />
                  <button className="settings-submit" type="button">提交反馈</button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
