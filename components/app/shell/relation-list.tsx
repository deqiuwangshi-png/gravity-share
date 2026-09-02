/**
 * 关注 / 粉丝列表（client，D3 2026-08-23）——服务端读列表传入，交互（关注/取关）在客户端
 * 每项：头像 + 昵称 + 简介（可点跳主页）+ 关注/已关注按钮
 * 关注态：服务端传入 initialFollowingIds（Set），本地 toggle 维护，避免每项一次查询（N+1）
 * 2026-09-02 迁移：relation-* 系列与关注按钮原子类化（原 styles/app/relation.css + profile.css .profile-follow-btn）
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { createClient } from "@/lib/supabase/client";
import { toggleFollow } from "@/lib/queries-social";
import type { UserCardDTO } from "@/lib/types";

export function RelationList({
  users,
  initialFollowingIds,
  emptyText,
}: {
  users: UserCardDTO[];
  /** 当前登录用户已关注的所有 id（粉丝页用于判断每项关注态） */
  initialFollowingIds: string[];
  emptyText: string;
}) {
  const [followingIds, setFollowingIds] = useState<Set<string>>(() => new Set(initialFollowingIds));
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onToggle(userId: string) {
    if (busyId) return;
    setBusyId(userId);
    try {
      const next = await toggleFollow(createClient(), userId);
      setFollowingIds((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(userId);
        else copy.delete(userId);
        return copy;
      });
    } catch {
      /* 写失败保持原状态（P1-3 回滚） */
    }
    setBusyId(null);
  }

  return (
    <div className="grid gap-[10px]">
      {users.length === 0 ? (
        <p className="px-[18px] py-12 text-center text-[13px] text-soft">{emptyText}</p>
      ) : (
        users.map((user) => {
          const following = followingIds.has(user.id);
          return (
            <div className="flex items-center gap-3 rounded-[12px] border border-line bg-surface p-3 transition-[border-color] duration-[180ms] hover:border-line-primary" key={user.id}>
              <Link className="flex min-w-0 flex-1 items-center gap-[10px] no-underline" href={`/profile/${user.id}`}>
                <AvatarBox path={user.avatarUrl} name={user.name} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[15px] font-semibold text-primary" />
                <div className="min-w-0">
                  <strong className="block text-[13px] text-foreground">{user.name}</strong>
                  {user.bio ? <small className="mt-[2px] block truncate text-[12px] text-soft">{user.bio.length > 40 ? `${user.bio.slice(0, 40)}…` : user.bio}</small> : null}
                </div>
              </Link>
              <button
                type="button"
                className={following
                  ? "ml-auto shrink-0 cursor-pointer rounded-full bg-hover px-5 py-2 text-[12px] font-normal text-muted transition-[background-color] duration-[180ms]"
                  : "ml-auto shrink-0 cursor-pointer rounded-full bg-primary px-5 py-2 text-[12px] font-semibold text-on-primary transition-[background-color] duration-[180ms] hover:bg-primary-dark"}
                onClick={() => void onToggle(user.id)}
                disabled={busyId === user.id}
                aria-pressed={following}
              >{following ? "已关注" : "关注"}</button>
            </div>
          );
        })
      )}
    </div>
  );
}
