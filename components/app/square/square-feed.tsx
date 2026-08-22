/**
 * 广场内容区（client）：领域胶囊（我的领域 + 探索领域）+ 话题流
 * 2b 起数据读库（RLS 公开读）：挂载拉取；发布后监听 SQUARE_UPDATED_EVENT 重新拉取
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EXPLORE_DOMAINS, MY_DOMAINS } from "@/lib/config";
import { LoadError } from "@/components/app/common/load-error";
import { createClient } from "@/lib/supabase/client";
import { fetchSquarePosts, SQUARE_UPDATED_EVENT } from "@/lib/queries";
import { hasUrl } from "@/components/app/common/linkified-text";
import { AuthorLink } from "@/components/app/common/author-link";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { CommentIcon, LikeIcon, ViewIcon } from "@/components/app/common/action-icons";
import type { SquarePostDTO } from "@/lib/types";

export function SquareFeed() {
  const [domain, setDomain] = useState<string>("全部");
  const [posts, setPosts] = useState<SquarePostDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    void fetchSquarePosts(createClient())
      .then((list) => {
        setPosts(list);
        setLoading(false);
      })
      .catch(() => {
        setFailed(true);
        setLoading(false);
      });
  }, []);

  /* 重试（事件处理器内重置状态，避免 effect 内同步 setState） */
  function retry() {
    setLoading(true);
    setFailed(false);
    load();
  }

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener(SQUARE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SQUARE_UPDATED_EVENT, onUpdate);
  }, [load]);

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

      {failed ? (
        <LoadError onRetry={retry} />
      ) : loading ? (
        <p className="feed-loading">加载中…</p>
      ) : (
        <div className="square-list">
          {filtered.map((post) => (
            <Link className="square-card" href={`/square/${post.id}`} key={post.id}>
              <div className="square-card-head">
                <AvatarBox path={post.authorAvatar} name={post.authorName} className="square-avatar" />
                <strong><AuthorLink authorId={post.authorId} name={post.authorName} /></strong>
                <small>{post.time}</small>
              </div>
              <p className="square-card-content">{post.content}</p>
              <div className="square-card-meta">
                <span><LikeIcon />{post.likes} 赞</span>
                <span><CommentIcon />{post.comments} 评论</span>
                <span><ViewIcon />{post.views} 浏览</span>
                {(hasUrl(post.content) || post.url) && <span className="square-card-link-mark">含链接</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
