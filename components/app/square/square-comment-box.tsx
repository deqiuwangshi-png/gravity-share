/**
 * 广场评论输入框（client，2b 起落库）
 * 提交后 insert comments（RLS 校验作者）；成功后 router.refresh() 让服务端重拉评论列表与计数
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SquareCommentBox({ postId }: { postId: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
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
    router.refresh();
  }

  return (
    <form className="square-comment-box" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="说点什么…"
        aria-label="评论内容"
      />
      <button className="square-comment-submit" type="submit" disabled={sending || !text.trim()}>
        {sending ? "发送中…" : "发布"}
      </button>
      {error && <span className="square-mock-note" role="alert">发布失败，请重试</span>}
    </form>
  );
}
