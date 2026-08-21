/**
 * 广场评论输入框（client，mock 提交）
 * 纯前端演示：提交后提示成功，不落库
 */
"use client";

import { useState } from "react";

export function SquareCommentBox() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <form className="square-comment-box" onSubmit={handleSubmit}>
      <input type="text" placeholder="说点什么…" aria-label="评论内容" />
      <button className="square-comment-submit" type="submit">发布</button>
      {submitted && <span className="square-mock-note" role="status">已发布（Mock）</span>}
    </form>
  );
}
