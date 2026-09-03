/**
 * 个人主页视图（client）——资料由 server 端读 Supabase 传入
 * 封面/头像 → 昵称/简介/数据 → 胶囊导航（推荐 / 评论）→ 内容流
 * 2026-08-23 重构：Tab 统一为「推荐」（我发布的推荐+推广）与「评论」（我发表过的评论）
 * 2c：支持他人主页（isSelf=false 显示关注按钮 + 粉丝数）
 * 2026-09-02 迁移：profile-* 系列原子类化（原 styles/app/profile.css），封面交互用 group 变体
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ProfileSquarePost } from "@/components/app/shell/profile-square-post";
import { ProfileComment } from "@/components/app/shell/profile-comment";
import { ProfileTabs, type ProfileTab } from "@/components/app/shell/profile-tabs";
import { ProfileEditModal } from "@/components/app/shell/profile-edit-modal";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { AuthorBadge } from "@/components/app/common/author-badge";
import { createClient } from "@/lib/supabase/client";
import { removeImage, safeCoverUrl, uploadImage, validateImage } from "@/lib/storage";
import { SITE_INFO } from "@/lib/config";
import { EmptyState } from "@/components/ui/empty-state";
import { SQUARE_UPDATED_EVENT } from "@/lib/events";
import { fetchCommentsByAuthor } from "@/lib/queries-comments";
import { fetchSquarePostsByAuthor } from "@/lib/queries-posts";
import { isFollowing, toggleFollow } from "@/lib/queries-social";
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
  badge = "none",
  initialPosts = [],
}: {
  name: string;
  bio: string;
  userId: string;
  isSelf?: boolean;
  followerCount?: number;
  followingCount?: number;
  avatarUrl?: string;
  coverUrl?: string;
  /** 用户标识（021） */
  badge?: "none" | "official" | "discoverer";
  /** P0-8 服务端预取内容流（SSR 首帧爬虫可见）；交互刷新逻辑不变 */
  initialPosts?: SquarePostDTO[];
}) {
  const [tab, setTab] = useState<ProfileTab>("推荐");
  const [myPosts, setMyPosts] = useState<SquarePostDTO[]>(initialPosts);
  const [myComments, setMyComments] = useState<CommentDTO[]>([]);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [cover, setCover] = useState(coverUrl);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState("");
  /* 编辑个人资料弹窗（头像+昵称；简介在用户设置里编辑） */
  const [showEdit, setShowEdit] = useState(false);
  const router = useRouter();

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
    <div className="grid grid-cols-[1fr_220px] items-start gap-[22px] max-[900px]:grid-cols-1">
      {/* 中间栏：个人主页主体 */}
      <div className="min-w-0">
        {/* 封面横幅：宽高比 4:1（2026-08-22 从 3:1 降低高度，保持头像骑跨衔接自然）；底色 bg-hover 占位，图走内联 backgroundImage */}
        <div
          className="group relative z-[1] aspect-[4/1] rounded-[14px] bg-hover bg-cover bg-center"
          style={cover ? { backgroundImage: `url(${safeCoverUrl(cover)})` } : undefined}
        >
          {/* 更换封面按钮：默认隐藏，封面 hover/聚焦显示（触屏恒显兜底） */}
          <div className="absolute right-3 top-3 opacity-0 transition-[opacity] duration-[180ms] group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100!">
            {isSelf && (
              <>
                <input
                  id="cover-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={(event) => void onCoverChange(event)}
                />
                <label className="cursor-pointer rounded-full border border-line bg-surface px-[14px] py-[7px] text-[12px] text-muted transition-[border-color,color] duration-[180ms] hover:border-line-primary hover:text-primary" htmlFor="cover-file" role="button">
                  {coverBusy ? "上传中…" : "更换封面"}
                </label>
              </>
            )}
          </div>
        </div>
        {coverError && <p className="mt-2 text-[12px] text-error">{coverError}</p>}

        {/* 头像 → 昵称行（右侧操作按钮）→ 统计行（头像正下方，垂直布局） */}
        <div className="relative z-[2] px-[18px]">
          {/* 头像 88px：负边距 -44px 下沉骑跨封面底边，白描边 3px 与页面底色衔接 */}
          <AvatarBox
            path={avatarUrl}
            name={name}
            className="-mt-11 flex size-[88px] shrink-0 items-center justify-center rounded-full border-[3px] border-surface bg-primary-soft text-[30px] font-semibold text-primary"
            badge={badge}
          />
          <div className="mt-[10px] flex min-w-0 items-center gap-[14px]">
            <h1 className="m-0 whitespace-nowrap text-[22px] font-semibold tracking-[-0.3px]">{name}<AuthorBadge badge={badge} /></h1>
            {isSelf ? (
              <button
                className="ml-auto cursor-pointer rounded-full border border-line bg-surface px-4 py-2 text-[12px] text-muted transition-[border-color,color] duration-[180ms] hover:border-line-primary hover:text-primary"
                type="button"
                onClick={() => setShowEdit(true)}
              >编辑个人资料</button>
            ) : (
              <button
                className={following
                  ? "ml-auto cursor-pointer rounded-full bg-hover px-5 py-2 text-[12px] font-normal text-muted transition-[background-color] duration-[180ms]"
                  : "ml-auto cursor-pointer rounded-full bg-primary px-5 py-2 text-[12px] font-semibold text-on-primary transition-[background-color] duration-[180ms] hover:bg-primary-dark"}
                type="button"
                onClick={() => void onFollow()}
                disabled={followBusy}
                aria-pressed={following}
              >{following ? "已关注" : "关注"}</button>
            )}
          </div>
          <div className="mt-[10px] flex gap-[18px] whitespace-nowrap text-[13px] text-muted">
            <span><b className="font-semibold text-foreground">{myPosts.length}</b>发布</span>
            {isSelf ? (
              <>
                <Link className="no-underline hover:[&_b]:text-primary" href="/profile/following"><b className="font-semibold text-foreground">{followingCount}</b>关注</Link>
                <Link className="no-underline hover:[&_b]:text-primary" href="/profile/followers"><b className="font-semibold text-foreground">{followerCount}</b>粉丝</Link>
              </>
            ) : (
              <span><b className="font-semibold text-foreground">{followerCount}</b>粉丝</span>
            )}
          </div>
        </div>

        {/* 简介：统计行下方，左对齐纯文本（非卡片），行高 1.7 弱层级；可空 */}
        <div className="px-[18px] pb-4 pt-[14px]">{bio ? <p className="m-0 max-w-[560px] text-[13px] leading-[1.7] text-muted">{bio}</p> : null}</div>

        {showEdit && (
          <ProfileEditModal
            name={name}
            avatarUrl={avatarUrl}
            userId={userId}
            onClose={() => setShowEdit(false)}
            onSaved={() => router.refresh()}
          />
        )}

        <ProfileTabs active={tab} onChange={setTab} />

        <div className="pt-1">
          {tab === "推荐" && (myPosts.length > 0
            ? myPosts.map((item) => <ProfileSquarePost post={item} key={item.id} isSelf={isSelf} onChanged={load} />)
            : <EmptyState className="px-[18px] py-10">还没有发布内容，点右上角「+ 发布」分享好东西。</EmptyState>)}

          {tab === "评论" && (myComments.length > 0
            ? myComments.map((comment) => <ProfileComment comment={comment} key={comment.id} onChanged={load} />)
            : <EmptyState className="px-[18px] py-10">还没有发表过评论。</EmptyState>)}
        </div>
      </div>

      {/* 右栏：站点信息占位（≤900px 单列隐藏） */}
      <aside className="sticky top-4 max-[900px]:hidden">
        <div className="flex flex-wrap gap-x-[14px] gap-y-[6px] border-b border-line pb-3">
          <Link className="text-[12px] text-muted transition-[color] duration-[180ms] hover:text-primary" href="/guidelines">引力社区规范</Link>
          <Link className="text-[12px] text-muted transition-[color] duration-[180ms] hover:text-primary" href="/privacy">隐私政策</Link>
          <Link className="text-[12px] text-muted transition-[color] duration-[180ms] hover:text-primary" href="/terms">用户协议</Link>
          <Link className="text-[12px] text-muted transition-[color] duration-[180ms] hover:text-primary" href="/enforcement">举报与处罚细则</Link>
        </div>
        <p className="mt-3 text-[11px] leading-[1.9] text-soft">
          {SITE_INFO.icp}<br />
          {SITE_INFO.police}<br />
          {SITE_INFO.copyright}. All rights reserved.
        </p>
      </aside>
    </div>
  );
}
