import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SquareActions } from "@/components/app/square/square-actions";
import { SquareCommentBox } from "@/components/app/square/square-comment-box";
import { LinkifiedText } from "@/components/app/common/linkified-text";
import { AuthorLink } from "@/components/app/common/author-link";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { createClient } from "@/lib/supabase/server";
import { fetchComments, fetchSquarePostById } from "@/lib/queries";
import { publicImageUrl } from "@/lib/storage";

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
  const comments = await fetchComments(supabase, "square", id);

  return (
    <div className="app-content square-detail-wrap">
      <article className="square-detail">
        <Link className="square-back" href="/square">← 返回广场</Link>

        <div className="square-post-head">
          <AvatarBox path={post.authorAvatar} name={post.authorName} className="square-avatar" />
          <div className="square-post-meta">
            <strong><AuthorLink authorId={post.authorId} name={post.authorName} /></strong>
            <small>{post.time}</small>
          </div>
        </div>

        <p className="square-content"><LinkifiedText text={post.content} /></p>

        {/* 原创配图（S-1 起，广场详情展示） */}
        {post.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element -- 用户上传图，走公开 URL */
          <img className="square-post-image" src={publicImageUrl("post", post.imageUrl)} alt="帖子配图" />
        )}

        <div className="square-tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>

        <SquareActions postId={post.id} likes={post.likes} views={post.views} />

        <section className="square-comments">
          <h2>评论 {post.comments}</h2>
          <SquareCommentBox postId={post.id} />
          <div className="square-comment-list">
            {comments.map((comment) => (
              <div className="square-comment" key={comment.id}>
                <AvatarBox path={comment.authorAvatar} name={comment.authorName} className="square-avatar" />
                <div className="square-comment-body">
                  <div className="square-comment-meta">
                    <strong><AuthorLink authorId={comment.authorId} name={comment.authorName} /></strong>
                    <small>{comment.time}</small>
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
