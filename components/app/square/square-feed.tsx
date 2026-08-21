/**
 * 广场内容区（client）：领域胶囊（我的领域 + 探索领域）+ 话题流
 * 话题数据来自广场话题池（lib/square-store）：发布入口 C 的内容立即可见
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EXPLORE_DOMAINS, MY_DOMAINS } from "@/lib/config";
import { getSquarePosts, SQUARE_UPDATED_EVENT } from "@/lib/square-store";
import { hasUrl } from "@/components/app/common/linkified-text";

export function SquareFeed() {
  const [domain, setDomain] = useState<string>("全部");
  const [, forceRender] = useState(0);

  useEffect(() => {
    const onUpdate = () => forceRender((t) => t + 1);
    window.addEventListener(SQUARE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SQUARE_UPDATED_EVENT, onUpdate);
  }, []);

  const posts = getSquarePosts();
  const filtered = domain === "全部" ? posts : posts.filter((post) => post.tags.includes(domain));

  return (
    <>
      <div className="square-domains" role="tablist" aria-label="按领域筛选">
        <div className="square-domain-row">
          <span className="square-domain-label">我的领域</span>
          {MY_DOMAINS.map((name) => (
            <button
              type="button"
              key={name}
              className={`square-domain-chip${domain === name ? " active" : ""}`}
              onClick={() => setDomain(name)}
            >{name}</button>
          ))}
        </div>
        <div className="square-domain-row explore">
          <span className="square-domain-label">探索领域</span>
          {EXPLORE_DOMAINS.map((name) => (
            <button
              type="button"
              key={name}
              className={`square-domain-chip explore${domain === name ? " active" : ""}`}
              onClick={() => setDomain(name)}
            >{name}<em>新</em></button>
          ))}
        </div>
      </div>

      <div className="square-list">
        {filtered.map((post) => (
          <Link className="square-card" href={`/square/${post.id}`} key={post.id}>
            <div className="square-card-head">
              <span className="square-avatar">{post.author.slice(0, 1)}</span>
              <strong>{post.author}</strong>
              <small>{post.time}</small>
            </div>
            <p className="square-card-content">{post.content}</p>
            <div className="square-card-meta">
              <span>{post.likes} 赞</span>
              <span>{post.comments} 评论</span>
              <span>{post.views} 浏览</span>
              {(hasUrl(post.content) || post.url) && <span className="square-card-link-mark">含链接</span>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
