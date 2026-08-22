import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SquareActions } from "@/components/app/square/square-actions";
import { SquareCommentBox } from "@/components/app/square/square-comment-box";
import { SquarePostView } from "@/components/app/square/square-post-view";
import { AuthorLink } from "@/components/app/common/author-link";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { CommentMenu } from "@/components/app/common/comment-menu";
import { CommentIcon } from "@/components/app/common/action-icons";
import { createClient } from "@/lib/supabase/server";
import { bumpViews, fetchComments, fetchSquarePostById } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const post = await fetchSquarePostById(supabase, id);
  return {
    title: post ? `${post.authorName} 的话题 | 引力` : "话题不存在 | 引力",
    description: post?.content.slice(0, 60),
  };
}

export default async function SquareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const post = await fetchSquarePostById(supabase, id);
  if (!post) notFound();
  /* BUG-4：进入详情 +1 浏览（RPC security definer，失败静默；013 起作者本人不计、30 分钟去重） */
  await bumpViews(supabase, "square", id).catch(() => {});
  const comments = await fetchComments(supabase, "square", id);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user?.id ?? "";

  return (
    <div className="app-content square-detail-wrap">
      <article className="square-detail">
        <Link className="square-back" href="/square">← 返回广场</Link>

        {/* 帖子主体：发帖头 + 三点菜单（本人 删/改/复/享，他人 举报/复/享）+ 正文（可编辑）+ 配图 */}
        <SquarePostView post={post} isOwner={post.authorId === myId} />

        <SquareActions postId={post.id} likes={post.likes} views={post.views} />

        <section className="square-comments">
          <h2><CommentIcon size={16} />评论 {post.comments}</h2>
          <SquareCommentBox postId={post.id} />
          <div className="square-comment-list">
            {comments.map((comment) => (
              <div className="square-comment" key={comment.id}>
                <AvatarBox
                  path={comment.authorAvatar}
                  name={comment.authorName}
                  className="square-avatar"
                  authorId={comment.authorId}
                />
                <div className="square-comment-body">
                  <div className="square-comment-meta">
                    <strong><AuthorLink authorId={comment.authorId} name={comment.authorName} /></strong>
                    <small>{comment.time}</small>
                    <CommentMenu comment={comment} isOwner={comment.authorId === myId} />
                  </div>
                  <p>{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}
