/**
 * 帖子详情页 /square/[id]（2026-09-03 架构拆分后）——只做「编排」：
 * 数据获取 → lib/square-detail.ts（cache 工厂 + 并行编排）
 * SEO/派生 → lib/seo.ts buildSquarePostSeo（headline/desc/cover 一次派生 → metadata + Article JSON-LD）
 * 本文件仅剩：import + 组装 + JSX 布局，不再内联任何数据访问或 SEO 构造。
 * 索引策略：帖子存在且 anon 可读（RLS 公开读，无登录墙）→ index；null → notFound 404（自动 noindex）
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SquareActions } from "@/components/app/square/square-actions";
import { SquarePostView } from "@/components/app/square/square-post-view";
import { CommentSection } from "@/components/app/square/comment-section";
import { SquareCard, homeGridClass } from "@/components/app/common/square-card";
import { getPost, loadSquareDetail } from "@/lib/square-detail";
import { buildSquarePostSeo, jsonLd } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  /* getPost 与页面主体共享 React cache（square-detail 层）——同一次请求只查一遍 */
  return buildSquarePostSeo(await getPost(id), id).metadata;
}

export default async function SquareDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  /* 取数编排在 square-detail 层：getPost（复用 metadata 缓存）+ 评论/登录态/相关文章并行 */
  const loaded = await loadSquareDetail(id);
  if (!loaded) notFound();
  const { post, comments, myId, related } = loaded;
  /* 派生与 generateMetadata 同一函数同源 → H1 与 SEO title 严格一致（P0-1 六条硬约束） */
  const seo = buildSquarePostSeo(post, id);

  return (
    <div className="app-content">
      {/* Article 结构化数据（UGC 长尾词入口，2026-08-25 SEO；buildSquarePostSeo 派生，
          headline/desc/image 与 metadata、H1 同源——post 已判空，article 必非 null） */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(seo.article!) }}
      />
      <article className="mx-auto w-full max-w-[720px] px-1 pb-10">
        {/* 2026-08-27 方案A：广场并入首页，返回目标 /square → /home，文案同步 */}
        <Link className="mb-[22px] inline-block text-[13px] text-muted transition-[color] duration-[180ms] hover:text-primary" href="/home">← 返回首页</Link>

        {/* P0-2 H1：标题提炼结果（server 渲染，SSR 首帧可见；正文首行与之同文属正常，靠字号/字重区分层级） */}
        <h1 className="m-0 mb-[14px] break-words text-[22px] font-bold leading-[1.45] tracking-[-0.2px]">{seo.headline}</h1>

        {/* 帖子主体：发帖头 + 三点菜单（本人 删/改/复/享，他人 举报/复/享）+ 正文（可编辑）+ 配图 */}
        <SquarePostView post={post} isOwner={post.authorId === myId} />

        <SquareActions postId={post.id} likes={post.likes} />

        {/* P0-6 相关内容：同分类优先内链（帖子→帖子，形成内容网络；纯 server 渲染，爬虫可沿链接深入） */}
        {related.length > 0 && (
          <section className="mt-[30px] border-t border-line pt-[18px]">
            <h2 className="m-0 mb-[14px] text-[15px] font-semibold text-muted">相关内容</h2>
            <div className={homeGridClass}>{related.map((item) => <SquareCard post={item} key={item.id} />)}</div>
          </section>
        )}

        {/* 评论区（017 起：顶层评论 + 一层回复 + 点赞） */}
        <CommentSection postId={post.id} initialComments={comments} myId={myId} />
      </article>
    </div>
  );
}
