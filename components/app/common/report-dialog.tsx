/**
 * 举报弹窗（2026-09-03：举报从菜单内联面板改为 Dialog + 单选列表；原 post-menu 的 report view 态与
 * submitReport 整体迁移至此，菜单回归「举报/复制/分享」三常驻项）
 * 结构：标题行（DialogTitle + 关闭 ×）→ 对象回显条（类型 pill + 内容摘要，隐私仅摘要两行）
 * → 原因单选列表（aria-pressed 行按钮）→ 「其他」展开补充说明 textarea（必填：trim 非空才解锁提交）
 * → 底部取消 / 提交举报（未满足条件 disabled；提交中 busy「提交中…」）
 * 提交：RLS 写 reports 表（detail 一并入库）→ toast 成功关弹窗 / 失败停留弹窗；
 * 飞书工作台同步 fire-and-forget（凭证缺失/表未加列/不可达均静默，不影响主流程）
 * 消费方：post-menu（唯一）；props 稳定供将来独立举报入口复用
 */
"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { stripHtml } from "@/lib/text";
import { REPORT_REASONS, REPORT_DETAIL_MAX, makeReportId } from "@/lib/reports";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "./toast";

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  content,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 内容归属：square 帖子 / comment 评论 */
  targetType: "square" | "comment";
  targetId: string;
  /** 被举报内容原文（帖子为富文本 HTML、评论为纯文本；回显摘要统一经 stripHtml） */
  content: string;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  /* 摘要：去 HTML → 空白折叠 → 两行截断（line-clamp-2）；隐私：仅摘要，不发全文 */
  const excerpt = stripHtml(content).replace(/\s+/g, " ").trim();
  /* 「其他」须补充说明（trim 非空）才可提交 */
  const needDetail = reason === "其他";
  const canSubmit = !!reason && (!needDetail || detail.trim().length > 0);

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    const note = needDetail ? detail.trim() : "";
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        show("请先登录", "danger");
        return;
      }
      const { error } = await supabase.from("reports").insert({
        id: makeReportId(),
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason: reason!,
        detail: note,
      });
      if (error) {
        show("举报失败，请重试", "danger");
        return;
      }
      show("已收到举报，我们会尽快处理");
      onOpenChange(false);
      /* 同步飞书工作台（fire-and-forget：凭证缺失/表未加列/不可达均静默） */
      void fetch("/api/reports/feishu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, detail: note }),
      }).catch(() => {});
    } catch {
      show("举报失败，请重试", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        /* 提交中屏蔽一切关闭通道（×/Esc/遮罩），由 onOpenChange 统一拦截 */
        if (!next && busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[min(380px,calc(100%-2rem))] rounded-card bg-surface">
        <div className="grid gap-4 p-5">
          {/* ① 标题行 */}
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-[15px]">举报内容</DialogTitle>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-soft"
                aria-label="关闭"
                disabled={busy}
              >
                <X size={14} />
              </Button>
            </DialogClose>
          </div>

          {/* ② 对象回显条：类型 pill + 内容摘要（两行截断） */}
          <div className="flex items-start gap-2.5 rounded-[10px] bg-hover p-3">
            <span className="mt-px shrink-0 rounded-[6px] bg-primary-soft px-2 py-0.5 text-[11px] font-medium leading-[1.4] text-primary">
              {targetType === "comment" ? "评论" : "帖子"}
            </span>
            <p className="min-w-0 text-[12px] leading-[1.5] text-muted line-clamp-2">
              {excerpt || "（无文字内容）"}
            </p>
          </div>

          {/* ③ 原因单选列表（aria-pressed 行按钮；官方 RadioGroup 未接入，登记审计 §九） */}
          <div className="grid gap-1" role="group" aria-label="举报原因">
            {REPORT_REASONS.map((item) => {
              const selected = reason === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selected}
                  disabled={busy}
                  onClick={() => setReason(item)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-[9px] border p-[9px_12px] text-left text-[13px] transition-[background-color,border-color] duration-[150ms] disabled:cursor-default ${
                    selected
                      ? "border-line-primary bg-primary-soft font-medium text-primary"
                      : "border-transparent text-foreground hover:bg-hover"
                  }`}
                >
                  <span>{item}</span>
                  {selected && <Check size={14} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>

          {/* ④ 「其他」补充说明（必填：提交钮 disabled 直至 trim 非空） */}
          {needDetail && (
            <div className="grid gap-1.5">
              <textarea
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                maxLength={REPORT_DETAIL_MAX}
                rows={3}
                aria-label="补充说明"
                placeholder="请补充说明具体情况（必填）"
                className="w-full resize-none rounded-[9px] border border-line bg-surface p-[9px_12px] text-[13px] text-foreground outline-none placeholder:text-soft focus:border-line-primary [font:inherit]"
              />
              <p className="text-right text-[11px] leading-none text-soft">
                {detail.length}/{REPORT_DETAIL_MAX}
              </p>
            </div>
          )}

          {/* ⑤ 底部操作 */}
          <div className="mt-1 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm" disabled={busy}>
                取消
              </Button>
            </DialogClose>
            <Button variant="default" size="sm" className="min-w-[88px]" disabled={!canSubmit || busy} onClick={() => void submit()}>
              {busy ? "提交中…" : "提交举报"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
