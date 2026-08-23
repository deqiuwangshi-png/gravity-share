/**
 * 关注 / 粉丝列表（client，D3 2026-08-23）——服务端读列表传入，交互（关注/取关）在客户端
 * 每项：头像 + 昵称 + 简介（可点跳主页）+ 关注/已关注按钮
 * 关注态：服务端传入 initialFollowingIds（Set），本地 toggle 维护，避免每项一次查询（N+1）
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { AvatarBox } from "@/components/app/common/avatar-box";
import { createClient } from "@/lib/supabase/client";
import { toggleFollow } from "@/lib/queries";
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
    <div className="relation-list">
      {users.length === 0 ? (
        <p className="relation-empty">{emptyText}</p>
      ) : (
        users.map((user) => {
          const following = followingIds.has(user.id);
          return (
            <div className="relation-item" key={user.id}>
              <Link className="relation-user" href={`/profile/${user.id}`}>
                <AvatarBox path={user.avatarUrl} name={user.name} className="relation-avatar" />
                <div className="relation-meta">
                  <strong>{user.name}</strong>
                  {user.bio ? <small>{user.bio.length > 40 ? `${user.bio.slice(0, 40)}…` : user.bio}</small> : null}
                </div>
              </Link>
              <button
                type="button"
                className={`profile-follow-btn${following ? " following" : ""}`}
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
