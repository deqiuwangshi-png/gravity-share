import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SquareActions } from "@/components/app/square/square-actions";
import { SquareCommentBox } from "@/components/app/square/square-comment-box";
import { LinkifiedText } from "@/components/app/common/linkified-text";
import { getSquareComments, getSquarePost } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = getSquarePost(id);
  return {
    title: post ? `${post.author} 的话题 | 引力` : "话题不存在 | 引力",
    description: post?.content.slice(0, 60),
  };
}

export default async function SquareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getSquarePost(id);
  if (!post) notFound();
  const comments = getSquareComments(id);

  return (
    <div className="app-content square-detail-wrap">
      <article className="square-detail">
        <Link className="square-back" href="/square">← 返回广场</Link>

        <div className="square-post-head">
          <span className="square-avatar">{post.author.slice(0, 1)}</span>
          <div className="square-post-meta">
            <strong>{post.author}</strong>
            <small>{post.time}</small>
          </div>
        </div>

        <p className="square-content"><LinkifiedText text={post.content} /></p>

        <div className="square-tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>

        <SquareActions likes={post.likes} views={post.views} />

        <section className="square-comments">
          <h2>评论 {post.comments}</h2>
          <SquareCommentBox />
          <div className="square-comment-list">
            {comments.map((comment) => (
              <div className="square-comment" key={comment.id}>
                <span className="square-avatar">{comment.author.slice(0, 1)}</span>
                <div className="square-comment-body">
                  <div className="square-comment-meta">
                    <strong>{comment.author}</strong>
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
