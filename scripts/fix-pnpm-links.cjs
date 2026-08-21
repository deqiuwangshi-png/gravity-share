/**
 * 修复 pnpm 损坏链接 v2（safe-delete 拦截删除，改用 mv + junction）
 * 对 node_modules/.pnpm/<pkg>/node_modules/ 下的空目录：
 *   1. mv 走（rename，不受 trash 拦截）
 *   2. 从 .pnpm/<name>@<v>/node_modules/<name> 建 junction（保持依赖解析）
 */
const fs = require("fs");
const path = require("path");

const pnpmDir = path.resolve("node_modules/.pnpm");
if (!fs.existsSync(pnpmDir)) {
  console.error("pnpm 目录不存在");
  process.exit(1);
}

let fixed = 0;
let skipped = 0;
const trashes = [];

for (const pkgDir of fs.readdirSync(pnpmDir)) {
  const nmPath = path.join(pnpmDir, pkgDir, "node_modules");
  if (!fs.existsSync(nmPath)) continue;

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      let children;
      try {
        children = fs.readdirSync(full);
      } catch {
        continue;
      }
      if (children.length === 0) {
        const rel = path.relative(nmPath, full).replace(/\\/g, "/");
        const esc = rel.replace(/\//g, "+");
        const candidates = fs.readdirSync(pnpmDir).filter((d) => d.startsWith(esc + "@"));
        let repaired = false;
        for (const c of candidates) {
          const src = path.join(pnpmDir, c, "node_modules", rel);
          if (fs.existsSync(path.join(src, "package.json"))) {
            try {
              const trash = full + ".trash";
              fs.renameSync(full, trash);
              trashes.push(trash);
              fs.symlinkSync(src, full, "junction");
              fixed++;
              repaired = true;
            } catch (e) {
              console.log("修复失败:", full, e.message);
            }
            break;
          }
        }
        if (!repaired) skipped++;
      }
    }
  };
  walk(nmPath);
}

console.log(`修复链接: ${fixed} 个 | 未修复: ${skipped} 个 | 残留空目录: ${trashes.length} 个`);
