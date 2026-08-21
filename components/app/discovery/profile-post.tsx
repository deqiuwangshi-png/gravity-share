/**
 * 个人主页帖子卡（Twitter/X 风格，client）
 * 头像 + 昵称 + 时间 → 正文 → 圆角链接预览卡（左小图 + 右标题/摘要，整卡可点跳原平台）
 * 整卡可点 → /discover/[id]
 */
"use client";

import Link from "next/link";
import type { DiscoveryItem } from "@/lib/types";

export function ProfilePost({ item }: { item: DiscoveryItem }) {
  const body = item.note ?? item.description ?? "";
  const avatar = item.author?.charAt(0) ?? "推";
  const linkTitle = item.title ?? body.slice(0, 30);
  const linkDesc = item.description && item.description !== item.note ? item.description : undefined;
  const kindMark = item.kind === "video" ? "▶ 视频" : item.kind === "doc" ? "DOC" : "链接";

  return (
    <Link className="profile-post" href={`/discover/${item.id}`}>
      <div className="profile-post-head">
        <span className="profile-post-avatar">{avatar}</span>
        <b>{item.author ?? "引力推荐"}</b>
        <small>{item.publishTime ?? ""}</small>
      </div>

      <p className="profile-post-body">{body}</p>

      {item.commercial && (
        <p className="promo-note profile-post-promo"><b>⚠ 推广</b> · {item.promoType ?? "推广"} · 风险自判</p>
      )}

      {item.url && (
        <span className="profile-link-preview">
          <span className="profile-link-thumb">
            {item.kind === "image" && item.mediaUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- mock 直链图 */
              <img src={item.mediaUrl} alt="" />
            ) : (
              <span className="profile-link-mark">{kindMark}</span>
            )}
          </span>
          <span className="profile-link-body">
            <b>{linkTitle}</b>
            {linkDesc && <small>{linkDesc}</small>}
          </span>
        </span>
      )}
    </Link>
  );
}
