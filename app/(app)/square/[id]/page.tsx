import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { headers } from "next/headers";
import { SquareActions } from "@/components/app/square/square-actions";
import { SquarePostView } from "@/components/app/square/square-post-view";
import { CommentSection } from "@/components/app/square/comment-section";
import { SquareCard } from "@/components/app/common/square-card";
import { AdSlot } from "@/components/common/ad-slot";
import { AD_SLOTS } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { fetchComments } from "@/lib/queries-comments";
import { bumpViews, fetchSquarePostById, fetchSquarePosts } from "@/lib/queries-posts";
import { stripHtml } from "@/lib/text";
import { publicImageUrl } from "@/lib/storage";
import { SITE_URL, buildArticle, jsonLd } from "@/lib/seo";
import { postHeadline } from "@/lib/post-title";

/* P0-2 性能优化（2026-08-31）：同一次请求内 generateMetadata 与页面主体共享同一查询
 * （React cache 以 id 为 key 去重）——进详情页不再把同一帖查两遍 */
const getPost = cache(async (id: string) => {
  const supabase = await createClient();
  return fetchSquarePostById(supabase, id);
});

/* P0-6 相关文章：同分类优先（排除自身），不足 4 条按时间补其他分类，最多 6 条
 * （与 getPost 并行发；React cache 以 category+excludeId 为 key 去重） */
const getRelated = cache(async (category: string, excludeId: string) => {
  const supabase = await createClient();
  const posts = await fetchSquarePosts(supabase, 100);
  const same = posts.filter((post) => post.category === category && post.id !== excludeId);
  if (same.length >= 4) return same.slice(0, 6);
  const others = posts.filter((post) => post.id !== excludeId && post.category !== category);
  return [...same, ...others].slice(0, 6);
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  /* 标题提炼（P0-1，L1-L4 流水线）：用户标题 > 正文实体 > 分类 > 作者兜底；与页面 H1 同源 */
  const pageTitle = post
    ? postHeadline({
        title: post.title,
        content: post.content,
        category: post.category,
        tags: post.tags,
        url: post.url,
        authorName: post.authorName,
        postType: post.postType,
      })
    : "话题不存在";
  const desc = post ? (stripHtml(post.content).slice(0, 160) || pageTitle) : "";
  /* OG image：有配图（封面/图集首张）输出；无图不填（不造默认图） */
  const coverSrc = post?.imageUrl ? publicImageUrl("post", post.imageUrl) : undefined;
  return {
    title: pageTitle,
    description: desc,
    alternates: { canonical: `/square/${id}` },
    openGraph: {
      title: pageTitle,
      description: desc,
      type: "article",
      url: `${SITE_URL}/square/${id}`,
      ...(coverSrc ? { images: [{ url: coverSrc }] } : {}),
    },
    twitter: {
      ...(coverSrc ? { images: [coverSrc] } : {}),
    },
  };
}

export default async function SquareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  /* 与 generateMetadata 共享缓存（P0-2：同一请求内只查一次） */
  const post = await getPost(id);
  if (!post) notFound();
  /* BUG-4：进入详情 +1 浏览（RPC security definer，失败静默）
   * 023 起：游客传 IP（x-forwarded-for 首段，防刷键，不绑定用户身份）→ 帖子维度计数；
   * 登录用户保留 013 规则（作者不计 + 30 分钟去重）；本地 dev 无代理头 IP 为空 → 游客不计 */
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const supabase = await createClient();
  /* P0-2 并行化：评论 / 登录态 / 浏览计数三件事同时发，不再排队串行；相关文章与帖子主体并行（P0-6） */
  const [comments, userRes, related] = await Promise.all([
    fetchComments(supabase, id),
    supabase.auth.getUser(),
    getRelated(post.category, post.id),
  ]);
  void bumpViews(supabase, id, ip).catch(() => {});
  const myId = userRes.data.user?.id ?? "";
  /* 标题提炼（与 generateMetadata 同一函数 → H1 与 SEO title 严格一致） */
  const headline = postHeadline({
    title: post.title,
    content: post.content,
    category: post.category,
    tags: post.tags,
    url: post.url,
    authorName: post.authorName,
    postType: post.postType,
  });
  /* P1-1：Article JSON-LD 补字段的摘要与配图（与 metadata 同源） */
  const desc = stripHtml(post.content).slice(0, 160) || headline;
  const coverSrc = post.imageUrl ? publicImageUrl("post", post.imageUrl) : undefined;

  return (
    <div className="app-content square-detail-wrap">
      {/* Article 结构化数据（UGC 长尾词入口，2026-08-25 SEO；P1-1 补 description/image/mainEntityOfPage，headline 与 H1/metadata 同源） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            buildArticle({
              headline,
              authorName: post.authorName,
              url: `${SITE_URL}/square/${post.id}`,
              datePublished: post.createdAt,
              description: desc,
              image: coverSrc,
            }),
          ),
        }}
      />
      <article className="square-detail">
        {/* 2026-08-27 方案A：广场并入首页，返回目标 /square → /home，文案同步 */}
        <Link className="square-back" href="/home">← 返回首页</Link>

        {/* P0-2 H1：标题提炼结果（server 渲染，SSR 首帧可见；正文首行与之同文属正常，靠字号/字重区分层级） */}
        <h1 className="square-detail-title">{headline}</h1>

        {/* 帖子主体：发帖头 + 三点菜单（本人 删/改/复/享，他人 举报/复/享）+ 正文（可编辑）+ 配图 */}
        <SquarePostView post={post} isOwner={post.authorId === myId} />

        <SquareActions postId={post.id} likes={post.likes} views={post.views} />

        {/* P0-6 相关内容：同分类优先内链（帖子→帖子，形成内容网络；纯 server 渲染，爬虫可沿链接深入） */}
        {related.length > 0 && (
          <section className="square-related">
            <h2>相关内容</h2>
            <div className="home-grid">{related.map((item) => <SquareCard post={item} key={item.id} />)}</div>
          </section>
        )}

        {/* A3 广告位：阅读的自然断点（读完内容 → 要么离开要么看评论），不打断任何一种行为 */}
        <AdSlot slot={AD_SLOTS.squareDetail} variant="detail" />

        {/* 评论区（017 起：顶层评论 + 一层回复 + 点赞） */}
        <CommentSection postId={post.id} initialComments={comments} myId={myId} />
      </article>
    </div>
  );
}
