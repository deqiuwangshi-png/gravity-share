/**
 * 帖子图集展示（2026-08-31，037 图集化）：
 *   网格布局：1 张单列宽幅 / 2 张两列 / ≥3 张三列多行（3 列封顶，手机端体验友好）
 *   点击任意一张 → 全屏 lightbox（零依赖自绘：遮罩点击 / ESC / 左右键切换，计数显示）
 * 输入：有序 storage path 数组（第 1 张即封面，与 feed 的 image_url 一致）
 * 样式：2026-09-03 自 styles/app/gallery.css 迁 Tailwind（网格 + lightbox 全原子类化）
 */
"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { publicImageUrl } from "@/lib/storage";

/** 列数 → 网格列类（显式映射：check-styles 静态扫描需要字面量类名，勿改回模板拼接） */
const COL_CLASS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3"] as const;

/** 缩略图格：单张宽幅不裁切（aspect auto + contain，max-h 420）vs 多张方形裁切（cover） */
const ITEM_SINGLE = "cursor-zoom-in overflow-hidden rounded-[12px] border-0 bg-hover p-0";
const ITEM_MULTI = "aspect-square cursor-zoom-in overflow-hidden rounded-[12px] border-0 bg-hover p-0";
const IMG_SINGLE = "block max-h-[420px] w-full object-contain";
const IMG_MULTI = "block h-full w-full object-cover";

export function PostGallery({ paths }: { paths: string[] }) {
  const srcs = paths.map((p) => publicImageUrl("post", p));
  const [index, setIndex] = useState<number | null>(null);
  /* 1 张单列宽幅 / 2 张两列 / 3 张起三列（多行自动换行） */
  const cols = srcs.length >= 3 ? 3 : srcs.length;
  const single = srcs.length === 1;

  const close = () => setIndex(null);
  const prev = () => setIndex((i) => (i === null ? null : (i - 1 + srcs.length) % srcs.length));
  const next = () => setIndex((i) => (i === null ? null : (i + 1) % srcs.length));

  /* lightbox 键盘控制：ESC 关闭 / ← → 切换（仅打开时挂载；逻辑内联避免依赖每次重建的函数） */
  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIndex(null);
      if (event.key === "ArrowLeft") setIndex((i) => (i === null ? null : (i - 1 + srcs.length) % srcs.length));
      if (event.key === "ArrowRight") setIndex((i) => (i === null ? null : (i + 1) % srcs.length));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, srcs.length]);

  return (
    <>
      <div className={`mt-[14px] grid gap-2 ${COL_CLASS[cols]}`}>
        {srcs.map((src, i) => (
          <button
            type="button"
            key={src}
            className={single ? ITEM_SINGLE : ITEM_MULTI}
            onClick={() => setIndex(i)}
            aria-label={`查看第 ${i + 1} 张图片`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */}
            <img src={src} alt="" loading="lazy" className={single ? IMG_SINGLE : IMG_MULTI} />
          </button>
        ))}
      </div>

      {index !== null && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/88"
          role="dialog"
          aria-modal="true"
          aria-label="图片放大查看"
          onClick={close}
        >
          <button
            type="button"
            className="absolute right-[14px] top-[14px] flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-white/12 text-white hover:bg-white/24"
            aria-label="关闭"
            onClick={close}
          >
            <X size={20} />
          </button>
          {srcs.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-white/12 text-white hover:bg-white/24"
                aria-label="上一张"
                onClick={(event) => {
                  event.stopPropagation();
                  prev();
                }}
              >
                <ChevronLeft size={28} />
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-white/12 text-white hover:bg-white/24"
                aria-label="下一张"
                onClick={(event) => {
                  event.stopPropagation();
                  next();
                }}
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
          <div className="flex h-full w-full items-center justify-center p-[48px_64px]" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */}
            <img className="max-h-full max-w-full rounded-[6px] object-contain" src={srcs[index]} alt="" />
          </div>
          {srcs.length > 1 && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[13px] text-white/85">{index + 1} / {srcs.length}</div>}
        </div>
      )}
    </>
  );
}
