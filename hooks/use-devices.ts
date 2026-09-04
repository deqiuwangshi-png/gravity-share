/**
 * 登录设备 hook（2026-09-04 自 devices-panel 抽离——组件职责分层，见 AGENTS.md）
 * - 数据：GET /api/auth/devices（服务端 service_role 查 auth.sessions）+ 当前设备 sid（lib/session）
 * - 动作：撤销单个（DELETE + sessionId）/ 撤销所有（DELETE 无 body → 当前会话一并失效 → 整页刷新）
 * 组件只保留列表 DOM 与按钮文案。
 */
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { currentSessionId } from "@/lib/session";

export type Device = {
  id: string;
  browser: string;
  os: string;
  createdAt: string;
  lastActive: string;
};

export function useDevices() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [currentSid, setCurrentSid] = useState<string | null>(null);

  const load = useCallback(() => {
    void fetch("/api/auth/devices")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setDevices(data.devices))
      .catch(() => setFailed(true));
    void currentSessionId(createClient()).then(setCurrentSid);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** 退出单个设备（成功后重新拉取） */
  async function revoke(sessionId: string) {
    if (busyId) return;
    setBusyId(sessionId);
    try {
      const res = await fetch("/api/auth/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error();
      setBusyId(null);
      load();
    } catch {
      setBusyId(null);
    }
  }

  /** 退出所有设备：当前会话一并失效 → 整页刷新回登录 */
  async function revokeAll() {
    if (revokingAll) return;
    setRevokingAll(true);
    try {
      const res = await fetch("/api/auth/devices", { method: "DELETE" });
      if (!res.ok) throw new Error();
      window.location.reload();
    } catch {
      setRevokingAll(false);
    }
  }

  return { devices, failed, busyId, revokingAll, currentSid, revoke, revokeAll };
}
