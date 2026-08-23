/**
 * 登录设备列表（client，2026-08-23）——「登录设备」左侧导航项内容
 * 数据源：GET /api/auth/devices（service_role 查 auth.sessions）
 * 当前设备：解码当前 access_token 的 sid（JWT payload），与服务端 session id 比对标记
 * 交互：退出单个 / 退出所有（DELETE /api/auth/devices）；成功后重新拉取
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Smartphone, Monitor } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/text";

type Device = {
  id: string;
  browser: string;
  os: string;
  createdAt: string;
  lastActive: string;
};

/** 解码 access_token（base64url JWT payload）取 sid——标识当前设备 */
async function currentSessionId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return null;
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return (payload.sid as string) ?? null;
  } catch {
    return null;
  }
}

export function DevicesPanel() {
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
    void currentSessionId().then(setCurrentSid);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRevoke(sessionId: string) {
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

  async function onRevokeAll() {
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

  if (failed) return <p className="settings-edit-error">设备列表加载失败，请稍后重试。</p>;
  if (!devices) return <p className="settings-edit-error">加载中…</p>;

  return (
    <div className="devices-panel">
      <div className="devices-head">
        <p className="devices-desc">管理登录过你账号的设备。发现陌生设备请立即退出。</p>
        {devices.length > 1 && (
          <button type="button" className="devices-revoke-all" onClick={() => void onRevokeAll()} disabled={revokingAll}>
            {revokingAll ? "退出中…" : "退出所有设备"}
          </button>
        )}
      </div>

      {devices.length === 0 ? (
        <p className="devices-empty">暂无已登录设备。</p>
      ) : (
        <ul className="devices-list">
          {devices.map((device) => {
            const isCurrent = device.id === currentSid;
            return (
              <li className="devices-item" key={device.id}>
                <span className="devices-icon">
                  {device.os === "Android" || device.os === "iOS" ? <Smartphone size={18} /> : <Monitor size={18} />}
                </span>
                <div className="devices-meta">
                  <strong>
                    {device.os} · {device.browser}
                    {isCurrent && <em className="devices-current">当前设备</em>}
                  </strong>
                  <small>最近活跃：{formatRelativeTime(device.lastActive)}</small>
                </div>
                {!isCurrent && (
                  <button
                    type="button"
                    className="devices-revoke"
                    onClick={() => void onRevoke(device.id)}
                    disabled={busyId === device.id}
                  >{busyId === device.id ? "退出中…" : "退出"}</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
