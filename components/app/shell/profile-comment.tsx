/**
 * 个人主页「评论」tab 卡片（client）——仅展示我的评论内容（不关联原帖）
 * 头像 + 昵称 + 时间（右侧评论三点菜单：删除/复制/分享）→ 评论内容
 * 删除成功：onChanged 回调刷新列表
 * 2026-09-02 迁移：profile-comment-* 系列原子类化（原 styles/app/profile-posts.css）
 */
"use client";

import { PostMenu } from "@/components/app/common/post-menu";
import { AuthorBadge } from "@/components/app/common/author-badge";
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
    <div className="border-b border-line px-[18px] py-[14px]">
      <div className="mb-[6px] flex items-center gap-2">
        <AvatarBox path={comment.authorAvatar} name={comment.authorName} className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary" badge={comment.authorBadge} authorId={comment.authorId} />
        <b className="text-[13px] font-semibold">{comment.authorName}<AuthorBadge badge={comment.authorBadge} /></b>
        <small className="text-[11px] text-soft">{comment.time}</small>
        <PostMenu targetType="comment" targetId={comment.id} isOwner content={comment.content} onDeleted={onChanged} />
      </div>
      <p className="m-0 whitespace-pre-line break-words text-[13px] leading-[1.7] text-muted">{comment.content}</p>
    </div>
  );
}
