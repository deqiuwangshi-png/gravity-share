import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { SquareActions } from "@/components/app/square/square-actions";
import { SquarePostView } from "@/components/app/square/square-post-view";
import { CommentSection } from "@/components/app/square/comment-section";
import { createClient } from "@/lib/supabase/server";
import { fetchComments } from "@/lib/queries-comments";
import { bumpViews, fetchSquarePostById } from "@/lib/queries-posts";
import { stripHtml } from "@/lib/text";
import { SITE_URL, buildArticle, jsonLd } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const post = await fetchSquarePostById(supabase, id);
  /* 短帖无独立标题：SEO 标题回落「作者 的话题」，描述取正文纯文本 */
  const pageTitle = post ? `${post.authorName} 的话题` : "话题不存在";
  const desc = post ? stripHtml(post.content) : "";
  return {
    title: pageTitle,
    description: desc.slice(0, 120),
    alternates: { canonical: `/square/${id}` },
    openGraph: {
      title: pageTitle,
      description: desc.slice(0, 120),
      type: "article",
    },
  };
}

export default async function SquareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const post = await fetchSquarePostById(supabase, id);
  if (!post) notFound();
  /* BUG-4：进入详情 +1 浏览（RPC security definer，失败静默）
   * 023 起：游客传 IP（x-forwarded-for 首段，防刷键，不绑定用户身份）→ 帖子维度计数；
   * 登录用户保留 013 规则（作者不计 + 30 分钟去重）；本地 dev 无代理头 IP 为空 → 游客不计 */
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  await bumpViews(supabase, id, ip).catch(() => {});
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
              headline: stripHtml(post.content).slice(0, 60),
              authorName: post.authorName,
              url: `${SITE_URL}/square/${post.id}`,
              datePublished: post.createdAt,
            }),
          ),
        }}
      />
      <article className="square-detail">
        {/* 2026-08-27 方案A：广场并入首页，返回目标 /square → /home，文案同步 */}
        <Link className="square-back" href="/home">← 返回首页</Link>

        {/* 帖子主体：发帖头 + 三点菜单（本人 删/改/复/享，他人 举报/复/享）+ 正文（可编辑）+ 配图 */}
        <SquarePostView post={post} isOwner={post.authorId === myId} />

        <SquareActions postId={post.id} likes={post.likes} views={post.views} />

        {/* 评论区（017 起：顶层评论 + 一层回复 + 点赞） */}
        <CommentSection postId={post.id} initialComments={comments} myId={myId} />
      </article>
    </div>
  );
}
