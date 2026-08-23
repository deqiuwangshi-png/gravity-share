/**
 * 用户标识徽标（021 认证体系，对外公开）——渲染在作者名旁：
 * - official   官方蓝 V（机构/企业认证）
 * - discoverer 金牌「发现者」（个人认证）
 * - none/其他  不渲染
 */
import type { UserBadge } from "@/lib/types";

export function AuthorBadge({ badge, className }: { badge?: UserBadge; className?: string }) {
  if (badge === "official") {
    return (
      <span
        className={`author-badge badge-official${className ? ` ${className}` : ""}`}
        title="官方认证"
        aria-label="官方认证"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2 L13.4 8.6 L20 10 L13.4 11.4 L12 18 L10.6 11.4 L4 10 L10.6 8.6 Z" />
        </svg>
      </span>
    );
  }
  if (badge === "discoverer") {
    return (
      <span
        className={`author-badge badge-discoverer${className ? ` ${className}` : ""}`}
        title="认证发现者"
      >
        发现者
      </span>
    );
  }
  return null;
}
