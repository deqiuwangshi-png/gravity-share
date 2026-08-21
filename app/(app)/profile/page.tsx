/**
 * 个人主页（/profile，client）——三栏布局中间栏承载
 * 封面/头像重叠 → 昵称/简介/数据 → 胶囊导航（发现|推广|收藏|设置）→ 帖子流
 * 右栏：站点信息占位（隐私政策 | 用户协议 / 备案 / 版权）
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProfilePost } from "@/components/app/discovery/profile-post";
import { ProfileTabs, type ProfileTab } from "@/components/app/shell/profile-tabs";
import { DISCOVERY_UPDATED_EVENT, getDiscoveryItems } from "@/lib/discovery-store";

/** 当前用户（mock：与发布内容 author 一致） */
const ME = "我的账户";
const MY_BIO = "在引力分享好东西的人。让好东西有地方摆，让有需求的人找得到。";
const LIKED = 186;
const POINTS = 1280;
const FOLLOWING = 52;

export default function ProfilePage() {
  const [tab, setTab] = useState<ProfileTab>("发现");
  const [tick, setTick] = useState(0);

  /* 本会话新发布实时可见：监听内容池更新事件，重渲染时读取最新数据 */
  useEffect(() => {
    const onUpdate = () => setTick((t) => t + 1);
    window.addEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(DISCOVERY_UPDATED_EVENT, onUpdate);
  }, []);

  void tick;
  const myPosts = getDiscoveryItems().filter((item) => item.author === ME);
  const list = tab === "发现" ? myPosts : tab === "推广" ? myPosts.filter((item) => item.commercial) : [];

  return (
    <div className="app-content">
      <div className="profile-layout">
        {/* 中间栏：个人主页主体 */}
        <div className="profile">
          <div className="profile-cover">
            <div className="profile-cover-actions">
              <button className="profile-cover-btn" type="button" data-placeholder>更换封面</button>
            </div>
          </div>

          <div className="profile-head">
            <span className="profile-avatar">{ME.charAt(0)}</span>
            <button className="profile-edit-btn" type="button" data-placeholder>编辑个人资料</button>
          </div>

          <div className="profile-info">
            <h1 className="profile-name">{ME}</h1>
            <p className="profile-bio">{MY_BIO}</p>
            <div className="profile-stats">
              <span><b>{LIKED}</b> 点赞</span>
              <span><b>{POINTS}</b> 积分</span>
              <span><b>{FOLLOWING}</b> 关注</span>
            </div>
          </div>

          <ProfileTabs active={tab} onChange={setTab} />

          <div className="profile-tab-panel">
            {tab === "发现" && (list.length > 0
              ? list.map((item) => <ProfilePost item={item} key={item.id} />)
              : <p className="profile-empty">还没有发布内容，点右上角「+ 发布」分享好东西。</p>)}

            {tab === "推广" && (list.length > 0
              ? list.map((item) => <ProfilePost item={item} key={item.id} />)
              : <p className="profile-empty">还没有推广内容，走「推广外链」入口发布的会显示在这里。</p>)}

            {tab === "收藏" && <p className="profile-empty">还没有收藏，看到好东西点卡片上的 ♡ 收藏。</p>}

            {tab === "设置" && (
              <div className="profile-settings">
                <h3 className="profile-settings-title">个人资料</h3>
                <div className="settings-row">
                  <span className="settings-row-label">昵称</span>
                  <span className="settings-row-value">{ME}</span>
                  <button type="button" className="settings-row-action" data-placeholder>修改</button>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">头像</span>
                  <span className="settings-row-value">U</span>
                  <button type="button" className="settings-row-action" data-placeholder>修改</button>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">简介</span>
                  <span className="settings-row-value">{MY_BIO}</span>
                  <button type="button" className="settings-row-action" data-placeholder>编辑</button>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">邮箱</span>
                  <span className="settings-row-value">name@example.com</span>
                  <button type="button" className="settings-row-action" data-placeholder>修改</button>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">加入时间</span>
                  <span className="settings-row-value">2026-08</span>
                </div>

                <h3 className="profile-settings-title">账户安全</h3>
                <div className="settings-row">
                  <span className="settings-row-label">修改密码</span>
                  <span className="settings-row-value">上次修改 30 天前</span>
                  <button type="button" className="settings-row-action" data-placeholder>修改</button>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">登录设备</span>
                  <span className="settings-row-value">2 台在线</span>
                  <button type="button" className="settings-row-action" data-placeholder>管理</button>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">两步验证</span>
                  <span className="settings-row-value">未开启</span>
                  <button type="button" className="settings-row-action" data-placeholder>开启</button>
                </div>
                <div className="settings-row danger">
                  <span className="settings-row-label">永久删除账号</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右栏：站点信息占位 */}
        <aside className="profile-aside">
          <div className="profile-aside-links">
            <Link href="/privacy">隐私政策</Link>
            <Link href="/terms">用户协议</Link>
          </div>
          <p className="profile-aside-meta">
            浙ICP备2024107375号-4<br />
            浙公网安备33019202002666号<br />
            © 2026 Watcha. All rights reserved.
          </p>
        </aside>
      </div>
    </div>
  );
}
