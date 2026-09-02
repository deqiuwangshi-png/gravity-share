import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NOTICE_ARTICLES } from "@/lib/data";
import type { NoticeSection } from "@/lib/types";

/** 仅渲染配置中存在的 slug，其余 404 */
export const dynamicParams = false;

export function generateStaticParams() {
  return NOTICE_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = NOTICE_ARTICLES.find((a) => a.slug === slug);
  if (!article) return { title: "公告未找到 | 引力" };
  return { title: `${article.title} | 引力`, description: article.subtitle ?? `引力公告 · ${article.date}` };
}

/** 行内 **加粗** 解析（split 捕获组：奇数索引为加粗内容，不引入 markdown 库） */
function renderInline(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? <b key={i}>{part}</b> : <span key={i}>{part}</span>
  );
}

function renderSection(section: NoticeSection, idx: number) {
  return (
    <div key={idx}>
      {section.heading && <h2>{section.heading}</h2>}
      {section.sub && <h3>{section.sub}</h3>}
      {section.paras?.map((p, i) => <p key={i}>{renderInline(p)}</p>)}
      {section.quote && (
        <blockquote className="my-4 rounded-lg border-l-[3px] border-primary bg-hover p-[14px_18px]">
          {section.quote.map((q, i) => <p key={i} className="m-0 mb-2 text-[14px] leading-[1.8] text-muted last:mb-0">{renderInline(q)}</p>)}
        </blockquote>
      )}
      {section.list && (
        <ul>
          {section.list.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
        </ul>
      )}
      {section.ordered && (
        <ol>
          {section.ordered.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
        </ol>
      )}
      {section.parasAfter && <p>{renderInline(section.parasAfter)}</p>}
    </div>
  );
}

/** 公告正文页（/notice/[slug]，2026-08-24）：配置驱动，正文来自 lib/data.ts NOTICE_ARTICLES
 * 2026-08-31：来源感知返回——app 走马灯进入（?from=app）→「返回应用主页」/home；
 * 官网直访（无标记）→「返回首页」/（修复应用内点公告后返回被扔回官网的体验断裂） */
export default async function NoticePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;
  const fromApp = from === "app";
  const article = NOTICE_ARTICLES.find((a) => a.slug === slug);
  if (!article) return notFound();

  return (
    <div className="mx-auto max-w-[720px] p-[64px_24px_96px]">
      <header className="mb-16 flex items-center justify-between">
        <Link href={fromApp ? "/home" : "/"} className="text-[13px] text-muted transition-[color] duration-[180ms] hover:text-primary">{fromApp ? "← 返回应用主页" : "← 返回首页"}</Link>
      </header>
      <h1 className="mb-[10px] mt-0 text-[32px] tracking-[-1px]">{article.title}</h1>
      {article.subtitle && <p className="m-0 -mt-[6px] text-[15px] text-muted">{article.subtitle}</p>}
      <p className="mb-12 mt-0 text-xs text-soft">发布于 {article.date} · {article.author}</p>
      <article className="legal-section">
        {article.sections.map(renderSection)}
      </article>
      <footer className="mt-[72px] border-t border-line pt-6 text-xs text-soft">
        相关文档：<Link className="legal-link" href="/guidelines">引力社区规范</Link> ·{" "}
        <Link className="legal-link" href="/enforcement">举报与处罚细则</Link> ·{" "}
        <Link className="legal-link" href="/disclaimer">免责声明</Link>
      </footer>
    </div>
  );
}
