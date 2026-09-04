import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import type { ExternalLink } from "@/lib/external-links";

function ExternalLinkCard({ link }: { link: ExternalLink }) {
  return (
    <a
      className="flex min-w-0 items-center gap-3 rounded-[10px] border border-line bg-hover px-3 py-3 no-underline transition-[border-color,background-color] duration-[180ms] hover:border-line-primary hover:bg-primary-soft"
      href={link.href}
      aria-label={`打开外部链接 ${link.host}`}
    >
      <ExternalLinkIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0">
        <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-foreground">{link.host}</strong>
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-soft">{link.url}</span>
      </span>
    </a>
  );
}

export function ExternalLinkCards({ links }: { links: ExternalLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="mt-[14px] grid gap-2" aria-label="文章外链">
      {links.map((link) => <ExternalLinkCard key={link.url} link={link} />)}
    </div>
  );
}