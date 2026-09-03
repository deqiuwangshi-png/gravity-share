import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SQUARE_CATEGORIES, SQUARE_POST_TYPES } from "@/lib/config";

/**
 * 从迁移 SQL 提取 CHECK 约束的枚举值列表（如 '工具','技术' → ["工具","技术"]）
 * 守卫 A1「TS 枚举 + DB CHECK 双源」：改 config.ts 或迁移任一方向，本测试即红
 */
function extractCheckValues(sqlPath: string): string[] {
  const sql = readFileSync(fileURLToPath(new URL(sqlPath, import.meta.url)), "utf8");
  const match = sql.match(/check \([a-z_]+ in \(([^)]*)\)\)/);
  if (!match) throw new Error(`无法从 ${sqlPath} 提取 CHECK 枚举值`);
  return match[1].split(",").map((v) => v.trim().replace(/^'|'$/g, ""));
}

describe("枚举与迁移 CHECK 一致性（A1 双源守卫）", () => {
  it("SQUARE_CATEGORIES 与迁移 014 CHECK 一致", () => {
    const dbValues = extractCheckValues("../supabase/migrations/014-square-category.sql");
    expect([...SQUARE_CATEGORIES]).toEqual(dbValues);
  });

  it("SQUARE_POST_TYPES 与迁移 015 CHECK 一致", () => {
    const dbValues = extractCheckValues("../supabase/migrations/015-square-post-type.sql");
    expect([...SQUARE_POST_TYPES]).toEqual(dbValues);
  });
});
