/**
 * 广场评论输入框（client，2b 起落库）
 * 提交后 insert comments（RLS 校验作者）；成功后调用 onCreated 刷新评论列表（或 router.refresh() 兜底）
 * 多行：textarea rows=2，Enter 发送、Shift+Enter 换行
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createComment } from "@/lib/comment-actions";

export function SquareCommentBox({ postId, onCreated }: { postId: string; onCreated?: () => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSending(true);
    setError(false);
    /* 写库收口于 lib/comment-actions.createComment */
    const result = await createComment(supabase, { authorId: user.id, postId, content });
    setSending(false);
    if (!result.ok) {
      setError(true);
      return;
    }
    setText("");
    if (onCreated) onCreated();
    else router.refresh();
  }

  /** Enter 发送，Shift+Enter 换行 */
  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="mb-4">
      <form className="flex items-start gap-[10px] rounded-[12px] border border-line bg-surface px-3 py-[10px] focus-within:border-line-primary" onSubmit={handleSubmit}>
        <textarea
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="说点什么…（Enter 发送，Shift+Enter 换行）"
          aria-label="评论内容"
          maxLength={1000}
          className="min-h-10 max-h-[132px] min-w-0 flex-1 resize-y border-0 bg-transparent px-[2px] py-1 text-[13px] leading-[1.6] text-foreground outline-none placeholder:text-soft [font:inherit]"
        />
        <button className="shrink-0 cursor-pointer border-0 bg-transparent text-[13px] font-medium text-primary [font:inherit]" type="submit" disabled={sending || !text.trim()}>
          {sending ? "发送中…" : "发布"}
        </button>
      </form>
      {error && <p className="mx-[2px] mt-[6px] text-[12px] text-error" role="alert">发布失败，请重试</p>}
    </div>
  );
}
