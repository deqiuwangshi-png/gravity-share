/**
 * 个人主页视图（client）——资料由 server 端读 Supabase 传入
 * 封面/头像 → 昵称/简介/数据 → 胶囊导航（推荐 / 评论）→ 内容流
 * 2026-08-23 重构：Tab 统一为「推荐」（我发布的推荐+推广）与「评论」（我发表过的评论）
 * 2c：支持他人主页（isSelf=false 显示关注按钮 + 粉丝数）
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProfileSquarePost } from "@/components/app/shell/profile-square-post";
import { ProfileComment } from "@/components/app/shell/profile-comment";
import { ProfileTabs, type ProfileTab } from "@/components/app/shell/profile-tabs";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { createClient } from "@/lib/supabase/client";
import { publicImageUrl, removeImage, uploadImage, validateImage } from "@/lib/storage";
import { SITE_INFO } from "@/lib/config";
import {
  SQUARE_UPDATED_EVENT,
  fetchCommentsByAuthor,
  fetchSquarePostsByAuthor,
  isFollowing,
  toggleFollow,
} from "@/lib/queries";
import type { CommentDTO, SquarePostDTO } from "@/lib/types";

export default function ProfileView({
  name,
  bio,
  userId,
  isSelf = true,
  followerCount = 0,
  followingCount = 0,
  avatarUrl = "",
  coverUrl = "",
}: {
  name: string;
  bio: string;
  userId: string;
  isSelf?: boolean;
  followerCount?: number;
  followingCount?: number;
  avatarUrl?: string;
  coverUrl?: string;
}) {
  const [tab, setTab] = useState<ProfileTab>("推荐");
  const [myPosts, setMyPosts] = useState<SquarePostDTO[]>([]);
  const [myComments, setMyComments] = useState<CommentDTO[]>([]);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [cover, setCover] = useState(coverUrl);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState("");

  const load = useCallback(() => {
    void fetchSquarePostsByAuthor(createClient(), userId).then(setMyPosts).catch(() => { /* 失败保持空态，事件触发再试 */ });
    void fetchCommentsByAuthor(createClient(), userId).then(setMyComments).catch(() => {});
  }, [userId]);

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener(SQUARE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(SQUARE_UPDATED_EVENT, onUpdate);
  }, [load]);

  useEffect(() => {
    if (!isSelf) void isFollowing(createClient(), userId).then(setFollowing);
  }, [isSelf, userId]);

  async function onFollow() {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      setFollowing(await toggleFollow(createClient(), userId));
    } catch {
      /* 写失败保持原状态（P1-3 回滚） */
    }
    setFollowBusy(false);
  }

  /** 封面上传（S-1）：校验 → storage → update users.cover_url */
  async function onCoverChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !isSelf) return;
    const invalid = validateImage(file);
    if (invalid) {
      setCoverError(invalid);
      return;
    }
    setCoverError("");
    setCoverBusy(true);
    try {
      const path = await uploadImage("cover", file, userId);
      const { error: saveError } = await createClient().from("users").update({ cover_url: path }).eq("id", userId);
      if (saveError) {
        /* BUG-14：更新失败回滚新图 */
        void removeImage("cover", path);
        setCoverError("保存失败，请重试");
        return;
      }
      /* BUG-14：换图成功清理旧图（与旧 path 不同才删） */
      if (cover && cover !== path) void removeImage("cover", cover);
      setCover(path);
    } catch {
      setCoverError("上传失败，请重试");
    } finally {
      setCoverBusy(false);
    }
  }

  /* 2026-08-23：Tab 统一为 推荐/评论，无多数据源筛选逻辑 */

  return (
    <div className="profile-layout">
      {/* 中间栏：个人主页主体 */}
      <div className="profile">
        <div
          className="profile-cover"
          style={cover ? { backgroundImage: `url(${publicImageUrl("cover", cover)})` } : undefined}
        >
          <div className="profile-cover-actions">
            {isSelf && (
              <>
                <input
                  id="cover-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={(event) => void onCoverChange(event)}
                />
                <label className="profile-cover-btn" htmlFor="cover-file" role="button">
                  {coverBusy ? "上传中…" : "更换封面"}
                </label>
              </>
            )}
          </div>
        </div>
        {coverError && <p className="profile-cover-error">{coverError}</p>}

        {/* 头像 → 昵称行（右侧操作按钮）→ 统计行（头像正下方，垂直布局） */}
        <div className="profile-head">
          <AvatarBox path={avatarUrl} name={name} className="profile-avatar" />
          <div className="profile-name-row">
            <h1 className="profile-name">{name}</h1>
            {isSelf ? (
              <button className="profile-edit-btn" type="button" data-placeholder>编辑个人资料</button>
            ) : (
              <button
                className={`profile-follow-btn${following ? " following" : ""}`}
                type="button"
                onClick={() => void onFollow()}
                disabled={followBusy}
                aria-pressed={following}
              >{following ? "已关注" : "关注"}</button>
            )}
          </div>
          <div className="profile-stats">
            <span><b>{myPosts.length}</b>发布</span>
            {isSelf ? (
              <>
                <Link className="profile-stat-link" href="/profile/following"><b>{followingCount}</b>关注</Link>
                <Link className="profile-stat-link" href="/profile/followers"><b>{followerCount}</b>粉丝</Link>
              </>
            ) : (
              <span><b>{followerCount}</b>粉丝</span>
            )}
          </div>
        </div>

        {/* 简介：统计行下方，左对齐纯文本（非卡片），行高 1.7 弱层级；可空 */}
        <div className="profile-bio-row">{bio ? <p className="profile-bio">{bio}</p> : null}</div>

        <ProfileTabs active={tab} onChange={setTab} />

        <div className="profile-tab-panel">
          {tab === "推荐" && (myPosts.length > 0
            ? myPosts.map((item) => <ProfileSquarePost post={item} key={item.id} isSelf={isSelf} onChanged={load} />)
            : <p className="profile-empty">还没有发布内容，点右上角「+ 发布」分享好东西。</p>)}

          {tab === "评论" && (myComments.length > 0
            ? myComments.map((comment) => <ProfileComment comment={comment} key={comment.id} onChanged={load} />)
            : <p className="profile-empty">还没有发表过评论。</p>)}
        </div>
      </div>

      {/* 右栏：站点信息占位 */}
      <aside className="profile-aside">
        <div className="profile-aside-links">
          <Link href="/privacy">隐私政策</Link>
          <Link href="/terms">用户协议</Link>
        </div>
        <p className="profile-aside-meta">
          {SITE_INFO.icp}<br />
          {SITE_INFO.police}<br />
          {SITE_INFO.copyright}. All rights reserved.
        </p>
      </aside>
    </div>
  );
}
