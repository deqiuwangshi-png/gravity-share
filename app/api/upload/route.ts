/**
 * 图片上传（POST /api/upload，2026-08-23 安全加固 V1）
 * 信任边界：客户端声明不可信——服务端校验后才交给 service_role 上传：
 *   ① 鉴权（cookie 会话）② target 白名单（avatar/cover/post）③ 大小 ≤5MB
 *   ④ 内容嗅探（魔术字节：JPEG/PNG/GIF/WebP 文件头）⑤ 路径绑定 uid（post 追加 postId）
 * 返回存储 path；storage.ts 的 uploadImage 改走本接口（调用方零改动）。
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_SIZE = 5 * 1024 * 1024;
const TARGETS = ["avatar", "cover", "post"] as const;
const BUCKETS: Record<(typeof TARGETS)[number], string> = {
  avatar: "avatars",
  cover: "covers",
  post: "posts",
};

/** 文件头 → 是否合法图片（JPEG/PNG/GIF/WebP 魔术字节） */
function sniffImage(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  /* JPEG: FF D8 FF */
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  /* PNG: 89 50 4E 47 0D 0A 1A 0A */
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  /* GIF: 47 49 46 38 ("GIF8") */
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
  /* WebP: RIFF .... WEBP */
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return true;
  return false;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export async function POST(request: Request) {
  /* 1. 鉴权（本人） */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  /* 2. 表单解析 */
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const target = form.get("target") as string;
  const postId = (form.get("postId") as string) || undefined;
  const file = form.get("file") as File | null;
  if (!TARGETS.includes(target as (typeof TARGETS)[number])) {
    return NextResponse.json({ error: "invalid_target" }, { status: 400 });
  }
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  /* 3. 大小强制（服务端，不信客户端声明） */
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  /* 4. 内容嗅探（魔术字节）——拒绝 SVG/HTML/任意伪装文件 */
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!sniffImage(head)) {
    return NextResponse.json({ error: "not_image" }, { status: 400 });
  }

  /* 5. service_role 上传（路径绑定 uid；post 需 postId，路径段由服务端拼接） */
  const bucket = BUCKETS[target as (typeof TARGETS)[number]];
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const stamp = `${Date.now().toString(36)}-${randomSuffix()}`;
  const path = target === "post"
    ? `${user.id}/${postId ?? stamp}/${stamp}.${ext}`
    : `${user.id}/${stamp}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (error) return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  return NextResponse.json({ path });
}
