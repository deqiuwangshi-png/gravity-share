#!/usr/bin/env node
/**
 * 引力项目专属治理检查（零依赖 Node 脚本）
 * 作为 pnpm check 的一部分（校验规则见 AGENTS.md「维护与完成定义」）
 * 1) 每个 CSS 文件 ≤400 行（硬失败）
 * 2) 迁移文件数（001-0NN）与 ARCHITECTURE.md 声明一致（硬失败）
 * 3) CSS 孤儿类（styles 定义但 app/components 的 tsx 未引用）→ 提示级（提取前先剥离块注释，迁移说明里提及的已删类名不算 CSS 定义，避免误报孤儿；动态类名仍易误报）
 * 退出码：有硬失败项 → 1
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CSS_LIMIT = 400;

let failures = 0;
let warnings = 0;

function fail(msg) {
  failures += 1;
  console.error(`❌ ${msg}`);
}

function warn(msg) {
  warnings += 1;
  console.log(`⚠️  ${msg}`);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/* 1) CSS 行数红线 */
const cssFiles = walk(join(ROOT, "styles")).filter((p) => p.endsWith(".css"));
for (const f of cssFiles) {
  const lines = readFileSync(f, "utf8").split("\n").length;
  if (lines > CSS_LIMIT) fail(`styles/${relative(join(ROOT, "styles"), f)} 超 ${CSS_LIMIT} 行（${lines}）`);
}
console.log(`✅ CSS 行数检查：${cssFiles.length} 个文件`);

/* 2) 迁移数一致性（文档契约） */
const migDir = join(ROOT, "supabase", "migrations");
const migFiles = existsSync(migDir)
  ? readdirSync(migDir).filter((f) => /^\d{3}-.*\.sql$/.test(f))
  : [];
const maxMig = migFiles.length ? Math.max(...migFiles.map((f) => Number(f.slice(0, 3)))) : 0;
const arch = readFileSync(join(ROOT, "ARCHITECTURE.md"), "utf8");
const docMatch = arch.match(/数据库唯一真相（001-(\d{3})/);
if (docMatch) {
  const docNum = Number(docMatch[1]);
  if (docNum !== maxMig) {
    fail(`迁移数不一致：实际 001-${String(maxMig).padStart(3, "0")}，ARCHITECTURE.md 声明 001-${String(docNum).padStart(3, "0")}（请同步 ARCHITECTURE.md）`);
  }
} else {
  warn("ARCHITECTURE.md 未找到迁移清单声明（格式：数据库唯一真相（001-NNN））");
}
console.log(`✅ 迁移一致性检查：${migFiles.length} 个文件（001-${String(maxMig).padStart(3, "0")}）`);

/* 3) CSS 孤儿类（提示级） */
const tsxFiles = walk(join(ROOT, "app"))
  .concat(walk(join(ROOT, "components")))
  .filter((p) => p.endsWith(".tsx"));
const tsxSrc = tsxFiles.map((f) => readFileSync(f, "utf8")).join("\n");
const cssClasses = new Set();
for (const f of cssFiles) {
  // 2026-09-02 修复：先剥离块注释再提取类名（迁移说明中提及的已删类名不算 CSS 定义，否则误报孤儿）
  const css = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) cssClasses.add(m[1]);
}
let orphanCount = 0;
for (const cls of cssClasses) {
  if (!new RegExp(`\\b${cls}\\b`).test(tsxSrc)) {
    orphanCount += 1;
    if (orphanCount <= 15) warn(`CSS 孤儿类 .${cls}（无 TSX 引用，疑似清理候选）`);
  }
}
if (orphanCount > 15) warn(`另有 ${orphanCount - 15} 个 CSS 孤儿类（已省略；建议按 AGENTS.md「死代码护栏」当场清理）`);
console.log(`✅ CSS 引用检查：孤儿 ${orphanCount} 个（提示级）`);

console.log(
  failures > 0
    ? `\n检查未通过：${failures} 个硬失败项`
    : `\n✅ 治理检查全部通过${warnings > 0 ? `（${warnings} 个提示）` : ""}`,
);
process.exit(failures > 0 ? 1 : 0);
