/**
 * useFollow —— 关注 toggle hook（2026-09-03，自 profile-view 抽离——组件职责分层，见 AGENTS.md）：
 * 他人主页场景：挂载读初始关注态（isFollowing）→ 用户点按钮 toggle（toggleFollow）
 * 写失败保持原状态（P1-3 回滚，lib/queries/social.toggleFollow 已收口）
 * 供 ProfileView 他人主页消费；relation-list 是批量 Set 模式，不同构不并入
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isFollowing, toggleFollow } from "@/lib/queries/social";

export function useFollow(userId: string, enabled: boolean) {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    void isFollowing(createClient(), userId).then(setFollowing);
  }, [enabled, userId]);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      setFollowing(await toggleFollow(createClient(), userId));
    } catch {
      /* 写失败保持原状态（P1-3 回滚） */
    }
    setBusy(false);
  }, [busy, userId]);

  return { following, busy, toggle };
}
