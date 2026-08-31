/**
 * Waffo 连接自检脚本（沙箱，2026-08-30）
 * 用法：node scripts/waffo-sanity.mjs
 * 做什么：
 *   1. 读 .env.local 的 WAFFO_*（私钥支持 PEM 或 Base64，SDK 自动规范化）
 *   2. 初始化 SDK 客户端（密钥无效会立即抛错）
 *   3. GraphQL 查询店铺列表 → 确认 API 连通 + 你的 Store 在列
 *   4. 打印已配置的商品 ID（.env.local 里填了几个 PROD_xxx）
 * 预期输出：✅ SDK 初始化成功 → ✅ API 连通，找到店铺 STO_31Frky66hrVPQdNMkDjptP → 商品 ID 清单
 */
import { readFileSync } from "node:fs";
import { WaffoPancake } from "@waffo/pancake-ts";

/** 极简 .env 解析（不引依赖；只取 KEY=VALUE 行，剥掉首尾引号） */
function loadEnvFile(path) {
  const env = {};
  try {
    const text = readFileSync(path, "utf-8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* .env.local 不存在：交给下方缺变量检查报错 */
  }
  return env;
}

const env = { ...process.env, ...loadEnvFile(".env.local") };
const merchantId = env.WAFFO_MERCHANT_ID;
const privateKey = env.WAFFO_PRIVATE_KEY ?? env.WAFFO_PRIVATE_KEY_BASE64;

if (!merchantId || !privateKey) {
  console.error("❌ 缺少 WAFFO_MERCHANT_ID 或 WAFFO_PRIVATE_KEY（请先按手册填 .env.local）");
  process.exit(1);
}

console.log(`Merchant ID: ${merchantId}`);
console.log(`私钥: ${privateKey.startsWith("-----BEGIN") ? "PEM 格式" : "Base64/其他格式"}（已就位）`);

let client;
try {
  client = new WaffoPancake({ merchantId, privateKey });
  console.log("✅ SDK 初始化成功（密钥可解析）");
} catch (err) {
  console.error("❌ SDK 初始化失败：", err.message);
  process.exit(1);
}

try {
  const res = await client.graphql.query({
    query: "query { stores { id name status } }",
  });
  if (res.errors?.length) {
    console.error("❌ GraphQL 查询报错：", JSON.stringify(res.errors, null, 2));
    process.exit(1);
  }
  const stores = res.data?.stores ?? [];
  if (stores.length === 0) {
    console.warn("⚠️ 未查询到店铺（检查密钥是否为 test 环境）");
  } else {
    console.log(`✅ API 连通，找到 ${stores.length} 个店铺：`);
    for (const s of stores) {
      console.log(`   - ${s.id}  ${s.name ?? ""}  (${s.status ?? "?"})`);
    }
  }
} catch (err) {
  console.error("❌ API 调用失败：", err.message);
  console.error("   常见原因：私钥错误 / 不是 test 环境密钥 / 网络不通");
  process.exit(1);
}

/* 商品 ID 配置情况 */
const productKeys = [
  "WAFFO_PRODUCT_SUB_PRO_MONTHLY",
  "WAFFO_PRODUCT_SUB_PRO_YEARLY",
  "WAFFO_PRODUCT_SUB_TEAM_MONTHLY",
  "WAFFO_PRODUCT_SUB_TEAM_YEARLY",
  "WAFFO_PRODUCT_PROMO",
];
const filled = productKeys.filter((k) => env[k]);
console.log(`商品 ID：已填 ${filled.length}/5`);
for (const k of productKeys) {
  console.log(`   ${env[k] ? "✅" : "⬜"} ${k} = ${env[k] ?? "（未填，去 Waffo 后台建商品）"}`);
}

console.log("\n全部检查完成。若上面有 ❌/⬜，按提示处理后再跑一次。");
