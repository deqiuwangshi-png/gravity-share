/**
 * og-image 社交分享卡片（D-06 收口，2026-09-03）
 */
import { ImageResponse } from "next/og";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

export const alt = "引力 · 让好东西被发现";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* 模块级单次读取（Next 官方模式：静态资产、build 期完成，避免每请求读盘） */
const logoSrc = `data:image/png;base64,${await readFile(
  join(process.cwd(), "public/brand/logo.png"),
  "base64",
)}`;
const fontData = await readFile(join(process.cwd(), "app/fonts/og-sc-bold.otf"));

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          position: "relative",
          background: "#1A4A40",
          padding: "0 88px",
        }}
      >
        {/* 轨道装饰（呼应品牌「轨道星球」意象，纯边框圆） */}
        <div
          style={{
            position: "absolute",
            top: -170,
            right: -150,
            width: 480,
            height: 480,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.10)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -40,
            width: 240,
            height: 240,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.12)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 130,
            right: 120,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.28)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {/* satori 渲染上下文只能用原生 <img>（next/image 不可用） */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="引力 Logo" width={128} height={128} style={{ borderRadius: 28, display: "flex" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 26,
                color: "rgba(255,255,255,0.65)",
                letterSpacing: 10,
                fontFamily: "Noto Sans SC",
                display: "flex",
              }}
            >
              GRAVITY
            </div>
            <div
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: "#ffffff",
                marginTop: 14,
                fontFamily: "Noto Sans SC",
                display: "flex",
              }}
            >
              引力，让好东西被发现
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 88,
            bottom: 64,
            fontSize: 26,
            color: "rgba(255,255,255,0.60)",
            letterSpacing: 4,
            fontFamily: "Noto Sans SC",
            display: "flex",
          }}
        >
          yinli.online
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Noto Sans SC", data: fontData, style: "normal", weight: 700 }],
    },
  );
}
