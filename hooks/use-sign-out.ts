/**
 * 退出登录 hook（2026-09-04 自 user-menu 抽离——组件职责分层，见 AGENTS.md）
 * 编排：signOut（lib/auth-actions）→ 跳 /login → router.refresh()；组件只持有 signingOut 态做按钮文案。
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth-actions";

export function useSignOut() {
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  async function signOutToLogin() {
    setSigningOut(true);
    await signOut(createClient());
    router.push("/login");
    router.refresh();
  }

  return { signingOut, signOut: signOutToLogin };
}
