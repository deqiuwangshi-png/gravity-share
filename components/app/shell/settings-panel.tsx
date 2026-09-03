"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FEISHU_FEEDBACK_URL } from "@/lib/config";
import { updateUserProfile } from "@/lib/user-actions";
import { Input } from "@/components/ui/input";
import { FieldRow } from "@/components/ui/field-row";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DevicesPanel } from "./devices-panel";
import { VerifyPanel } from "./verify-panel";
import { PasswordDialog, EmailDialog, DeleteDialog } from "./account-action-dialogs";

export type PanelId = "settings" | "security" | "devices" | "verify" | "help";

/** 双栏左侧导航（2026-08-23：账户安全/登录设备抽离为独立项；021 加官方认证） */
const NAV_ITEMS = [
  ["用户设置", "settings"],
  ["账户安全", "security"],
  ["登录设备", "devices"],
  ["官方认证", "verify"],
  ["帮助与反馈", "help"],
] as const satisfies ReadonlyArray<readonly [string, PanelId]>;

/* 2026-09-02 迁移：settings-* 原子类化（原 styles/app/settings.css；profile-edit-modal 行控件同款就地） */
const groupClass = "mt-5 mb-1.5 text-xs font-semibold text-soft first:mt-2";
/* 行骨架常量（rowClass/rowClassPlain/rowLabelClass/errClass）2026-09-03 P3 收编 ui/field-row；以下为 settings 特有语义常量 */
const rowValueClass = "ml-auto text-[13px] text-muted";
const rowActionClass = "shrink-0 cursor-pointer border-0 bg-transparent text-[13px] font-medium text-primary [font:inherit]";

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
    <FieldRow label={label}>
      {value && <span className={rowValueClass}>{value}</span>}
      {action && (
        <button
          type="button"
          className={rowActionClass}
          data-placeholder={onAction ? undefined : ""}
          onClick={onAction}
        >
          {action}
        </button>
      )}
    </FieldRow>
  );
}

/**
 * 设置面板（下拉菜单弹出）：用户设置 / 账户安全 / 登录设备 / 官方认证 / 帮助
 * 2026-08-29 统一：改密码 / 改邮箱 / 注销 全部收敛为 AccountActionModal 弹窗（re-auth 校验当前密码）
 * 2026-09-02 迁移：settings-* 壳与行控件原子类化（遮罩背景 .settings-overlay、导航 active 竖条 ::before 见 decor.css）
 * 2026-09-03 职责拆分：三大敏感操作（改密/改邮/注销）状态机迁出 → ./account-action-dialogs（本文件 446 → ~250 行）
 */
export function SettingsPanel({ initialTab, onClose }: { initialTab: PanelId; onClose: () => void }) {
  const [tab, setTab] = useState<PanelId>(initialTab);
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [joined, setJoined] = useState("");
  const [uid, setUid] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  /* 简介行内编辑 */
  const [editing, setEditing] = useState<"bio" | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* 敏感操作弹窗：password / email / delete（弹窗本体与状态机在 account-action-dialogs，父仅分发；卸载即销毁 state） */
  const [modal, setModal] = useState<"password" | "email" | "delete" | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      setEmail(u.email ?? "");
      const { data: profile } = await supabase
        .from("users")
        .select("bio, created_at, uid")
        .eq("id", u.id)
        .maybeSingle();
      setBio((profile?.bio as string) ?? "");
      setJoined((profile?.created_at as string)?.slice(0, 7) ?? "");
      setUid((profile?.uid as string) ?? "");
    });
  }, []);

  /* Esc 关闭（2026-09-03 P1：手写 document keydown effect 删除——Radix Dialog 内置 Esc → onOpenChange，见下方 Dialog） */

  function closeModal() {
    setModal(null);
  }

  function startEdit(field: "bio") {
    setEditing(field);
    setDraft(bio);
    setError("");
  }

  async function saveEdit() {
    if (!userId || !editing) return;
    setSaving(true);
    setError("");
    const { ok } = await updateUserProfile(createClient(), userId, { bio: draft });
    setSaving(false);
    if (!ok) {
      setError("保存失败，请稍后重试");
      return;
    }
    setBio(draft);
    setEditing(null);
  }

  return (
    /* Dialog 壳（2026-09-03 P1 重构）：自研遮罩 + 手写 Esc → Radix Dialog 组合；
     * settings-overlay 浅色遮罩（decor.css 未分层 .18）经 overlayClassName 覆盖 Dialog 默认 .38；
     * Esc / 点遮罩关闭由 Radix 托管；三个敏感操作弹窗由 ./account-action-dialogs 渲染（独立 Dialog，React 树内嵌套 Root） */
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        overlayClassName="settings-overlay"
        className="grid h-[480px] w-[min(760px,calc(100%-2rem))] grid-cols-[220px_minmax(0,1fr)] overflow-hidden rounded-2xl bg-surface shadow-panel max-[640px]:grid-cols-1"
      >
        <aside className="flex flex-col gap-1 border-r border-line bg-raised p-[28px_24px] max-[640px]:flex-row max-[640px]:overflow-x-auto max-[640px]:border-r-0 max-[640px]:border-b max-[640px]:border-line max-[640px]:p-[12px_14px]">
          {NAV_ITEMS.map(([label, id]) => (
            <button
              key={id}
              type="button"
              className={`settings-nav-item relative block w-full cursor-pointer rounded-lg border-0 bg-transparent p-[10px_12px] text-left text-[13px] text-muted transition-[background-color,color] duration-[180ms] hover:bg-hover hover:text-foreground max-[640px]:whitespace-nowrap${tab === id ? " active bg-hover font-semibold text-foreground" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </aside>
        <section className="flex min-h-0 min-w-0 flex-col">
          <header className="flex items-center justify-between border-b border-line p-[28px_32px]">
            <DialogTitle asChild><h2 className="m-0 text-[16px]">{NAV_ITEMS.find(([, id]) => id === tab)![0]}</h2></DialogTitle>
            <DialogClose asChild>
              <button type="button" className="cursor-pointer border-0 bg-transparent p-1 text-[18px] text-soft" aria-label="关闭">×</button>
            </DialogClose>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-[8px_32px_32px]">
            {tab === "settings" && (
              <>
                <h3 className={groupClass}>个人资料</h3>
                <SettingRow label="邮箱" value={email || "未设置"} action="修改" onAction={() => setModal("email")} />
                {/* 引力号 UID（046）：系统分配永久身份标识，只读不可改；与邮箱/昵称等资料相互独立 */}
                <SettingRow label="引力号 UID" value={uid || "—"} />
                {editing === "bio" ? (
                  <div className="border-b border-line">
                    <FieldRow divided={false} label="简介" error={error}>
                      <Input
                        className="ml-auto max-w-[220px] min-w-0 flex-1"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveEdit();
                        }}
                        autoFocus
                        maxLength={80}
                        placeholder="一句话介绍自己（可留空）"
                      />
                      <div className="flex shrink-0 gap-3">
                        <button type="button" onClick={() => setEditing(null)} disabled={saving} className="cursor-pointer border-0 bg-transparent text-[13px] text-primary disabled:cursor-default disabled:text-disabled [font:inherit]">取消</button>
                        <button type="button" className="cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-primary disabled:cursor-default disabled:text-disabled [font:inherit]" onClick={() => void saveEdit()} disabled={saving}>
                          {saving ? "保存中…" : "保存"}
                        </button>
                      </div>
                    </FieldRow>
                  </div>
                ) : (
                  <SettingRow label="简介" value={bio || "未填写"} action="编辑" onAction={() => startEdit("bio")} />
                )}
                <SettingRow label="加入时间" value={joined || "—"} />
              </>
            )}
            {tab === "security" && (
              <>
                <h3 className={groupClass}>账户安全</h3>
                <SettingRow label="修改密码" value="输入当前密码直接修改" action="修改" onAction={() => setModal("password")} />
                <FieldRow label="永久删除账号" labelClassName="text-error">
                  <button type="button" className={`${rowActionClass} text-error`} onClick={() => setModal("delete")}>删除</button>
                </FieldRow>
              </>
            )}
            {tab === "devices" && (
              <DevicesPanel />
            )}
            {tab === "verify" && (
              <VerifyPanel />
            )}
            {tab === "help" && (
              <>
                <SettingRow label="如何开始使用引力？" action="查看" />
                <SettingRow label="引力和原平台是什么关系？" action="查看" />
                <SettingRow label="有收费计划吗？" action="查看" />
                <FieldRow label="查看完整帮助">
                  <Link className={rowActionClass} href="/help">前往</Link>
                </FieldRow>
                <div className="mt-5 grid gap-3">
                  <h3 className="m-0 text-[13px]">反馈意见</h3>
                  <p className="m-0 text-xs leading-[1.7] text-soft">遇到问题或有建议？通过飞书表单告诉我们，我们会尽快处理。</p>
                  <a
                    className="inline-flex h-[38px] items-center justify-center rounded-lg bg-primary text-[13px] font-semibold text-on-primary no-underline transition-[background-color] duration-[180ms] hover:bg-primary-dark hover:text-on-primary"
                    href={FEISHU_FEEDBACK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    前往提交反馈 →
                  </a>
                </div>
              </>
            )}
          </div>
        </section>
      </DialogContent>

      {/* 敏感操作弹窗（2026-09-03 职责拆分）：本体迁至 account-action-dialogs，父仅条件挂载 + 分发关闭；卸载即销毁子级 state */}
      {modal === "password" && <PasswordDialog onClose={closeModal} />}
      {modal === "email" && <EmailDialog currentEmail={email} onClose={closeModal} />}
      {modal === "delete" && <DeleteDialog onClose={closeModal} />}
    </Dialog>
  );
}
