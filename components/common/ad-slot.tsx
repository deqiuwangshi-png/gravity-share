/**
 * AdSense 广告位（client，2026-08-31）
 * 未配置发布商 ID 或该位置的单元 ID → 返回 null，页面零变化（未过审期间不留空白占位）
 * App Router 软导航不重载脚本：用 pathname 作 <ins> 的 key 强制重建元素，并在 effect 内重新 push，
 * 否则站内跳转后广告区空白——这是 Next App Router 接 AdSense 最常见的坑
 * ⚠ 位置纪律：只放自然流的非承诺区；自有投流位（全服横幅 / 置顶位 / 分类推荐位）永不接入第三方广告
 */
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ADSENSE_CLIENT } from "@/lib/config";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  /** 该位置的 AdSense 广告单元 ID */
  slot: string;
  /** 位置形态（决定容器样式：内容流卡片 / 详情页横条 / 分类页网格） */
  variant: "feed" | "detail" | "multiplex";
  /** 广告格式，默认 auto（自适应展示广告）；信息流广告后台会给出 fluid + layout key */
  format?: string;
  /** In-feed / Multiplex 广告的布局 key（AdSense 后台生成，与 format 配套） */
  layoutKey?: string;
};

/** 位置形态 → 容器类（显式映射：check-styles 静态扫描需要字面量类名，勿改回模板拼接） */
const VARIANT_CLASS = {
  feed: "ad-slot-feed",
  detail: "ad-slot-detail",
  multiplex: "ad-slot-multiplex",
} as const;

export function AdSlot({ slot, variant, format = "auto", layoutKey }: AdSlotProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!ADSENSE_CLIENT || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      /* 广告自身报错不得阻断页面渲染（如重复 push 同一 ins 元素） */
      return;
    }
  }, [pathname, slot]);

  if (!ADSENSE_CLIENT || !slot) return null;

  return (
    <div className={`ad-slot ${VARIANT_CLASS[variant]}`}>
      {/* 广告标识：AdSense 政策要求广告不得与自然内容混淆 */}
      <span className="ad-slot-tag">广告</span>
      <ins
        key={pathname}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layoutKey ? { "data-ad-layout-key": layoutKey } : {})}
        data-full-width-responsive="true"
      />
    </div>
  );
}
