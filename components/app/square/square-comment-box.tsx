/**
 * 广场评论输入框（client，2b 起落库）
 * 提交后 insert comments（RLS 校验作者）；成功后调用 onCreated 刷新评论列表（或 router.refresh() 兜底）
 * 多行：textarea rows=2，Enter 发送、Shift+Enter 换行
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    const { error: insertError } = await supabase.from("comments").insert({
      id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      author_id: user.id,
      target_type: "square",
      target_id: postId,
      content,
    });
    setSending(false);
    if (insertError) {
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
    <div className="square-comment-wrap">
      <form className="square-comment-box" onSubmit={handleSubmit}>
        <textarea
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="说点什么…（Enter 发送，Shift+Enter 换行）"
          aria-label="评论内容"
        />
        <button className="square-comment-submit" type="submit" disabled={sending || !text.trim()}>
          {sending ? "发送中…" : "发布"}
        </button>
      </form>
      {error && <p className="square-comment-error" role="alert">发布失败，请重试</p>}
    </div>
  );
}
