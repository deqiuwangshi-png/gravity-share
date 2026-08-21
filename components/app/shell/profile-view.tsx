/**
 * 个人主页视图（client）——资料由 server 端读 Supabase 传入
 * 封面/头像 → 昵称/简介/数据 → 胶囊导航 → 帖子流（2b 起按 author_id 读库）
 * 2c：支持他人主页（isSelf=false 显示关注按钮 + 粉丝数），收藏 tab 读库
 */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProfilePost } from "@/components/app/discovery/profile-post";
import { ProfileTabs, type ProfileTab } from "@/components/app/shell/profile-tabs";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { createClient } from "@/lib/supabase/client";
import { publicImageUrl, removeImage, uploadImage, validateImage } from "@/lib/storage";
import { SITE_INFO } from "@/lib/config";
import {
  DISCOVERY_UPDATED_EVENT,
  fetchDiscoveriesByAuthor,
  fetchFavorites,
  isFollowing,
  toggleFollow,
} from "@/lib/queries";
import type { DiscoveryDTO } from "@/lib/types";

export default function ProfileView({
  name,
  bio,
  points,
  userId,
  isSelf = true,
  followerCount = 0,
  followingCount = 0,
  avatarUrl = "",
  coverUrl = "",
}: {
  name: string;
  bio: string;
  points: number;
  userId: string;
  isSelf?: boolean;
  followerCount?: number;
  followingCount?: number;
  avatarUrl?: string;
  coverUrl?: string;
}) {
  const [tab, setTab] = useState<ProfileTab>("发现");
  const [myPosts, setMyPosts] = useState<DiscoveryDTO[]>([]);
  const [favorites, setFavorites] = useState<DiscoveryDTO[]>([]);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [cover, setCover] = useState(coverUrl);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState("");

  const load = useCallback(() => {
    void fetchDiscoveriesByAuthor(createClient(), userId).then(setMyPosts).catch(() => { /* 失败保持空态，事件触发再试 */ });
    if (isSelf) void fetchFavorites(createClient()).then(setFavorites).catch(() => {});
  }, [userId, isSelf]);

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
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

  const list = tab === "发现" ? myPosts : tab === "推广" ? myPosts.filter((item) => item.commercial) : [];

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

        <div className="profile-head">
          <AvatarBox path={avatarUrl} name={name} className="profile-avatar" />
          <div className="profile-name-row">
            <h1 className="profile-name">{name}</h1>
            <div className="profile-stats">
              <span><b>{myPosts.length}</b>发布</span>
              {isSelf && <span><b>{points}</b>积分</span>} {/* BUG-8：积分仅自己可见 */}
              {isSelf
                ? <span><b>{followingCount}</b>关注</span>
                : <span><b>{followerCount}</b>粉丝</span>}
            </div>
          </div>
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

        {/* 简介：昵称+数据行下方，可空；为空保留占位留白 */}
        <div className="profile-bio-row">{bio ? <p className="profile-bio">{bio}</p> : null}</div>

        <ProfileTabs active={tab} onChange={setTab} />

        <div className="profile-tab-panel">
          {tab === "发现" && (list.length > 0
            ? list.map((item) => <ProfilePost item={item} key={item.id} />)
            : <p className="profile-empty">还没有发布内容，点右上角「+ 发布」分享好东西。</p>)}

          {tab === "推广" && (list.length > 0
            ? list.map((item) => <ProfilePost item={item} key={item.id} />)
            : <p className="profile-empty">还没有推广内容，走「推广外链」入口发布的会显示在这里。</p>)}

          {tab === "收藏" && (isSelf
            ? (favorites.length > 0
              ? favorites.map((item) => <ProfilePost item={item} key={item.id} />)
              : <p className="profile-empty">还没有收藏，看到好东西点卡片上的 ♡ 收藏。</p>)
            : <p className="profile-empty">TA 的收藏仅自己可见。</p>)}
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
