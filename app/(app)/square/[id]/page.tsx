import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SquareActions } from "@/components/app/square/square-actions";
import { SquarePostView } from "@/components/app/square/square-post-view";
import { CommentSection } from "@/components/app/square/comment-section";
import { createClient } from "@/lib/supabase/server";
import { bumpViews, fetchComments, fetchSquarePostById } from "@/lib/queries";
import { SITE_URL, buildArticle, jsonLd } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const post = await fetchSquarePostById(supabase, id);
  return {
    title: post ? `${post.authorName} 的话题` : "话题不存在",
    description: post?.content.slice(0, 60),
    alternates: { canonical: `/square/${id}` },
    openGraph: {
      title: post ? `${post.authorName} 的话题` : "话题不存在",
      description: post?.content.slice(0, 120),
      type: "article",
    },
  };
}

export default async function SquareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const post = await fetchSquarePostById(supabase, id);
  if (!post) notFound();
  /* BUG-4：进入详情 +1 浏览（RPC security definer，失败静默；013 起作者本人不计、30 分钟去重） */
  await bumpViews(supabase, id).catch(() => {});
  const comments = await fetchComments(supabase, id);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user?.id ?? "";

  return (
    <div className="app-content square-detail-wrap">
      {/* Article 结构化数据（UGC 长尾词入口，2026-08-25 SEO） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            buildArticle({
              headline: post.content.slice(0, 60),
              authorName: post.authorName,
              url: `${SITE_URL}/square/${post.id}`,
              datePublished: post.createdAt,
            }),
          ),
        }}
      />
      <article className="square-detail">
        <Link className="square-back" href="/square">← 返回广场</Link>

        {/* 帖子主体：发帖头 + 三点菜单（本人 删/改/复/享，他人 举报/复/享）+ 正文（可编辑）+ 配图 */}
        <SquarePostView post={post} isOwner={post.authorId === myId} />

        <SquareActions postId={post.id} likes={post.likes} views={post.views} />

        {/* 评论区（017 起：顶层评论 + 一层回复 + 点赞） */}
        <CommentSection postId={post.id} initialComments={comments} myId={myId} />
      </article>
    </div>
  );
}
