/**
 * 图片上传（POST /api/upload，2026-08-23 安全加固 V1 / 2026-08-24 V11 限流配额）
 * 信任边界：客户端声明不可信——服务端校验后才交给 service_role 上传：
 *   ① 鉴权（cookie 会话）② 用户级限流（60s 次数 / 24h 字节配额，依赖 022 upload_audit）
 *   ③ target 白名单（avatar/cover/post）④ postId 字符集校验（防路径注入）
 *   ⑤ 大小 ≤5MB ⑥ 内容嗅探（魔术字节 → 服务端定 contentType，不信客户端 file.type）
 *   ⑦ 路径绑定 uid（post 追加 postId）⑧ 成功/失败均写 upload_audit（审计 + 计入风控）
 * 依赖迁移 022（upload_audit 表）；表未执行时限流自动放行（部署容错），上线顺序：先执行 022 SQL。
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

/* 用户级限流 / 配额（2026-08-24） */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10; /* 每用户 60s 最多 10 次上传（含失败，防高频试探） */
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAILY_QUOTA_BYTES = 50 * 1024 * 1024; /* 每用户每日成功上传 ≤ 50MB */

/** 文件头 → MIME（JPEG/PNG/GIF/WebP 魔术字节；服务端定类型，客户端 file.type 不可信） */
function detectType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  /* JPEG: FF D8 FF */
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  /* PNG: 89 50 4E 47 0D 0A 1A 0A */
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  /* GIF: 47 49 46 38 ("GIF8") */
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  /* WebP: RIFF .... WEBP */
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

/** postId 字符集（防路径注入；客户端可控的第二路径段） */
const POST_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/** 写上传审计（成功/失败均记；审计失败不影响主流程） */
async function auditUpload(
  admin: ReturnType<typeof createAdminClient>,
  input: { userId: string; target: string; bucket: string; path: string | null; bytes: number; status: "success" | "failed" },
): Promise<void> {
  try {
    await admin.from("upload_audit").insert({
      user_id: input.userId,
      target: input.target,
      bucket: input.bucket,
      path: input.path,
      bytes: input.bytes,
      status: input.status,
    });
  } catch {
    /* 022 未执行或写入失败：静默，不阻塞上传主流程 */
  }
}

export async function POST(request: Request) {
  /* 1. 鉴权（本人） */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  /* 2. 用户级限流 + 配额（upload_audit 计数；022 未执行时 catch 放行） */
  const now = Date.now();
  const since60s = new Date(now - RATE_LIMIT_WINDOW_MS).toISOString();
  const since24h = new Date(now - DAILY_WINDOW_MS).toISOString();
  try {
    const { count: recent } = await admin
      .from("upload_audit")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since60s);
    if ((recent ?? 0) >= RATE_LIMIT_MAX) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    const { data: dayRows } = await admin
      .from("upload_audit")
      .select("bytes")
      .eq("user_id", user.id)
      .eq("status", "success")
      .gte("created_at", since24h);
    const dayBytes = (dayRows ?? []).reduce((sum, row) => sum + (Number(row.bytes) || 0), 0);
    if (dayBytes >= DAILY_QUOTA_BYTES) {
      return NextResponse.json({ error: "daily_quota_exceeded" }, { status: 429 });
    }
  } catch {
    /* upload_audit 不存在（022 未执行）：放行，避免部署期上传全挂 */
  }

  /* 3. 表单解析 */
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
  /* 4. postId 字符集校验（防 ../ 路径注入逃逸 uid 目录） */
  if (postId !== undefined && !POST_ID_RE.test(postId)) {
    return NextResponse.json({ error: "invalid_post_id" }, { status: 400 });
  }
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  /* 5. 大小强制（服务端，不信客户端声明） */
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  const bucket = BUCKETS[target as (typeof TARGETS)[number]];

  /* 6. 内容嗅探（魔术字节）——拒绝 SVG/HTML/任意伪装文件；同时得出服务端 MIME */
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const mime = detectType(head);
  if (!mime) {
    await auditUpload(admin, { userId: user.id, target, bucket, path: null, bytes: file.size, status: "failed" });
    return NextResponse.json({ error: "not_image" }, { status: 400 });
  }

  /* 7. service_role 上传（路径绑定 uid；post 需 postId，路径段由服务端拼接） */
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const stamp = `${Date.now().toString(36)}-${randomSuffix()}`;
  const path = target === "post"
    ? `${user.id}/${postId ?? stamp}/${stamp}.${ext}`
    : `${user.id}/${stamp}.${ext}`;

  const { error } = await admin.storage.from(bucket).upload(path, file, {
    contentType: mime, /* 服务端嗅探类型，不信客户端 file.type */
  });
  if (error) {
    await auditUpload(admin, { userId: user.id, target, bucket, path, bytes: file.size, status: "failed" });
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
  await auditUpload(admin, { userId: user.id, target, bucket, path, bytes: file.size, status: "success" });
  return NextResponse.json({ path });
}
