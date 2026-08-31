/**
 * Waffo 一键建商品脚本（test 环境，2026-08-30）
 * 用法：node scripts/waffo-create-products.mjs   （或 pnpm waffo:create）
 * 做什么：用官方 SDK 在你的店铺下创建 5 个商品并打印 PROD_xxx：
 *   - 专业版 月付/年付（USD）· 团队版 月付/年付（USD）· 内容投流（CNY 一次性，占位价）
 * 幂等：.env.local 里已填过 ID 的商品自动跳过，可重复运行。
 * ⚠ 只在 test 环境生效（用 test 密钥）；上生产需在后台对商品执行 Publish。
 * ⚠ 创建后把输出的 PROD_xxx 填进 .env.local（本脚本不会自动改写你的 .env.local）。
 */
import { readFileSync } from "node:fs";
import { WaffoPancake } from "@waffo/pancake-ts";

/** 极简 .env 解析（不引依赖） */
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
    /* ignore */
  }
  return env;
}

const env = { ...process.env, ...loadEnvFile(".env.local") };
const merchantId = env.WAFFO_MERCHANT_ID;
const privateKey = env.WAFFO_PRIVATE_KEY ?? env.WAFFO_PRIVATE_KEY_BASE64;
const storeId = process.env.WAFFO_STORE_ID ?? "STO_31Frky66hrVPQdNMkDjptP"; // 你的店铺（已确认 active）

if (!merchantId || !privateKey) {
  console.error("❌ 缺少 WAFFO_MERCHANT_ID / WAFFO_PRIVATE_KEY（先跑 pnpm waffo:sanity 确认）");
  process.exit(1);
}

const client = new WaffoPancake({ merchantId, privateKey });
console.log(`✅ SDK 就绪 · 店铺 ${storeId}（test 环境）\n`);

/** 订阅商品定义：[环境变量键, 名称, 周期, 价格(USD)] */
const SUBS = [
  ["WAFFO_PRODUCT_SUB_PRO_MONTHLY", "Pro Monthly", "monthly", "9.90"],
  ["WAFFO_PRODUCT_SUB_PRO_YEARLY", "Pro Yearly", "yearly", "99.00"],
  ["WAFFO_PRODUCT_SUB_TEAM_MONTHLY", "Team Monthly", "monthly", "17.90"],
  ["WAFFO_PRODUCT_SUB_TEAM_YEARLY", "Team Yearly", "yearly", "179.00"],
];

for (const [key, name, period, amount] of SUBS) {
  if (env[key]) {
    console.log(`⏭️  ${key} 已配置（${env[key]}），跳过`);
    continue;
  }
  try {
    const { product } = await client.subscriptionProducts.create({
      storeId,
      name,
      billingPeriod: period,
      prices: { USD: { amount, taxCategory: "saas" } },
    });
    console.log(`✅ 创建订阅商品 ${name} (${period}) $${amount} → ${product.id}`);
    console.log(`   请填 .env.local：${key}=${product.id}`);
  } catch (err) {
    console.error(`❌ 创建 ${name} 失败：`, err.message ?? err);
  }
}

if (env.WAFFO_PRODUCT_PROMO) {
  console.log(`⏭️  WAFFO_PRODUCT_PROMO 已配置（${env.WAFFO_PRODUCT_PROMO}），跳过`);
} else {
  try {
    const { product } = await client.onetimeProducts.create({
      storeId,
      name: "Content Boost",
      prices: { CNY: { amount: "20.00", taxCategory: "saas" } },
    });
    console.log(`✅ 创建一次性商品 Content Boost（CNY ¥20 占位，实付由平台动态覆盖）→ ${product.id}`);
    console.log(`   请填 .env.local：WAFFO_PRODUCT_PROMO=${product.id}`);
  } catch (err) {
    console.error("❌ 创建 Content Boost 失败：", err.message ?? err);
  }
}

console.log("\n全部处理完成。把上面 ✅ 行的 ID 填进 .env.local 后，跑 pnpm waffo:sanity 确认 5/5。");
