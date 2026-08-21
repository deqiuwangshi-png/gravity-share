/**
 * 自助注销账号（POST /api/account/delete）
 * 流程：校验 session（本人）→ 清 storage 目录（avatars/covers/posts/{uid}/）→ admin.deleteUser（级联清 users/互动/通知；内容 set null 保留）
 * 安全：service_role 仅在服务端；删除目标硬绑定 session 用户，无任意删除面；SameSite cookie 防 CSRF。
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** 用户私有存储目录（路径前缀 = uid） */
const USER_BUCKETS = ["avatars", "covers", "posts"] as const;

/** 递归收集 bucket 下 prefix 目录的全部文件路径（目录条目无 id、name 以 / 结尾） */
async function collectPaths(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix: string,
  acc: string[],
): Promise<string[]> {
  const { data, error } = await admin.storage.from(bucket).list(prefix);
  if (error || !data) return acc;
  for (const item of data) {
    if (item.id) {
      acc.push(`${prefix}/${item.name}`);
    } else {
      await collectPaths(admin, bucket, `${prefix}/${item.name}`, acc);
    }
  }
  return acc;
}

/** 清空某用户三个桶下 uid 前缀目录的全部文件（尽力而为，失败不阻塞注销） */
async function removeUserStorage(uid: string): Promise<void> {
  const admin = createAdminClient();
  for (const bucket of USER_BUCKETS) {
    const paths: string[] = [];
    await collectPaths(admin, bucket, uid, paths);
    if (paths.length > 0) {
      await admin.storage.from(bucket).remove(paths);
    }
  }
}

export async function POST() {
  /* 1. 身份校验：必须已登录且删除目标 = 本人 */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  /* 2. 清理用户私有存储（本轮新增：注销即时清理，不留孤儿文件） */
  await removeUserStorage(user.id).catch(() => {});

  /* 3. service_role 删除 auth.users（FK 级联：users/likes/favorites/follows/notifications；内容 on delete set null 保留） */
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });

  /* 4. 前端收到 200 后 signOut() 清 cookie 并跳转 */
  return NextResponse.json({ ok: true });
}
