/**
 * 帖子图集展示（2026-08-31，037 图集化）：
 *   网格布局：1 张单列宽幅 / 2 张两列 / ≥3 张三列多行（3 列封顶，手机端体验友好）
 *   点击任意一张 → 全屏 lightbox（零依赖自绘：遮罩点击 / ESC / 左右键切换，计数显示）
 * 输入：有序 storage path 数组（第 1 张即封面，与 feed 的 image_url 一致）
 */
"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { publicImageUrl } from "@/lib/storage";

/** 列数 → 容器类（显式映射：check-styles 静态扫描需要字面量类名，勿改回模板拼接） */
const COL_CLASS = ["", "is-1", "is-2", "is-3"] as const;

export function PostGallery({ paths }: { paths: string[] }) {
  const srcs = paths.map((p) => publicImageUrl("post", p));
  const [index, setIndex] = useState<number | null>(null);
  /* 1 张单列宽幅 / 2 张两列 / 3 张起三列（多行自动换行） */
  const cols = srcs.length >= 3 ? 3 : srcs.length;

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
      <div className={`post-gallery ${COL_CLASS[cols]}`}>
        {srcs.map((src, i) => (
          <button
            type="button"
            key={src}
            className="post-gallery-item"
            onClick={() => setIndex(i)}
            aria-label={`查看第 ${i + 1} 张图片`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */}
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      {index !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="图片放大查看" onClick={close}>
          <button type="button" className="lightbox-close" aria-label="关闭" onClick={close}>
            <X size={20} />
          </button>
          {srcs.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-nav prev"
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
                className="lightbox-nav next"
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
          <div className="lightbox-stage" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 用户上传图走公开 URL */}
            <img className="lightbox-img" src={srcs[index]} alt="" />
          </div>
          {srcs.length > 1 && <div className="lightbox-count">{index + 1} / {srcs.length}</div>}
        </div>
      )}
    </>
  );
}
