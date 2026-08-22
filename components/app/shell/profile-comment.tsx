/**
 * 个人主页「评论」tab 卡片（client）——仅展示我的评论内容（不关联原帖）
 * 头像 + 昵称 + 时间（右侧评论三点菜单：删除/复制/分享）→ 评论内容
 * 删除成功：onChanged 回调刷新列表
 */
"use client";

import { CommentMenu } from "@/components/app/common/comment-menu";
import { AvatarBox } from "@/components/app/common/avatar-box";
import type { CommentDTO } from "@/lib/types";

export function ProfileComment({
  comment,
  onChanged,
}: {
  comment: CommentDTO;
  onChanged?: () => void;
}) {
  return (
    <div className="profile-comment">
      <div className="profile-comment-head">
        <AvatarBox path={comment.authorAvatar} name={comment.authorName} className="profile-comment-avatar" authorId={comment.authorId} />
        <b>{comment.authorName}</b>
        <small>{comment.time}</small>
        <CommentMenu comment={comment} isOwner onDeleted={onChanged} />
      </div>
      <p className="profile-comment-content">{comment.content}</p>
    </div>
  );
}
