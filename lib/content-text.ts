/**
 * 帖子「复制内容」文本组装（2026-09-03 C，三点菜单「复制」修正）——
 * 只复制作者内容本体：显式标题 + 正文；不复制作者信息/时间/统计/分类标签/UI 文案/页面内容。
 *
 * 数据真相（实读代码，勿猜）：
 * - square_posts.content = 正文全文，双态：TipTap 富文本 HTML / 存量纯文本（isRichText 判定）
 * - square_posts.title = 作者显式标题（038 独立列，发布/编辑必填）
 * - 标题用「作者原文 title」，绝不用 postHeadline 提炼结果——L2-L4 兜底会产出
 *   「×× 的分享」等派生文案，属 UI/生成文案，不该进剪贴板
 * - url（作者原文链接）正文未含时附加裸 URL 行（用户 2026-09-03 拍板）
 *
 * 与 lib/text.ts stripHtml 的语义分工：
 * - stripHtml：标签 → 空格折叠（卡片预览 / SEO 摘要，压成一行可截断）
 * - richTextToPlainText：保结构纯文本（复制内容：块级换行、列表符号、嵌套缩进）
 */
import { isRichText } from "@/lib/rich-content";
import { decodeHtmlEntities } from "@/lib/text";

/** 行内标签（剥壳留文字，不产生结构语义；code 在 pre 内由 pre 分支原样保留） */
const INLINE_TAGS = new Set(["a", "strong", "em", "s", "u", "code", "span"]);

/** 富文本 HTML → 可读纯文本（复制用，保结构）
 * 规则：p/h2/h3/blockquote 段间空行；br 段内换行；ul li 前缀「• 」、ol li 递增序号；
 * 嵌套列表两空格缩进；列表项之间单换行（非空行）；img/hr 整剔除（图无语义文字）；
 * 行内标签剥壳留文字；实体解码；连续空行折叠；首尾空白清除。
 * 输入为 sanitize-html 白名单净化后的受控 HTML（内容实体已转义，无裸 <>），token 切分可靠。
 */
export function richTextToPlainText(html: string): string {
  type Para = { text: string; li: boolean };
  const paras: Para[] = [];
  let seg = ""; // 当前段累积文本
  let inPre = false;
  let liDepth = 0; // >0 = 正在列表项内（嵌套列表父项亦计数，决定段类型紧凑换行）
  const listStack: Array<"ul" | "ol"> = [];
  const olCounters: number[] = []; // 与 listStack 对齐：每个活跃 ol 的下一个序号

  const pushPar = () => {
    /* 不能整体 trim()：会抹掉嵌套列表 marker 的行首缩进（"  • 子项"）。
       只清段首/段尾的整行空白与行尾空白，保留行内前导缩进（marker 前缀 / pre 代码缩进） */
    const t = seg
      .replace(/^[ \t]*\n+/, "") // 段首整行空白
      .replace(/[ \t]+$/gm, "") // 行尾空白
      .replace(/\n+$/, "") // 段尾空行
      .replace(/\n{3,}/g, "\n\n"); // 连续空行折叠
    if (t.trim()) paras.push({ text: t, li: liDepth > 0 });
    seg = "";
  };

  const tokens = html.split(/(<[^>]+>)/);
  for (const tok of tokens) {
    if (!tok) continue;
    if (tok[0] !== "<") {
      /* 行内空白折叠 + 实体解码（pre 内仅解码，保留代码缩进/换行） */
      const text = decodeHtmlEntities(tok);
      seg += inPre ? text : text.replace(/\s+/g, " ");
      continue;
    }
    const m = tok.match(/^<\/?([a-z][a-z0-9]*)/i);
    const tag = m?.[1]?.toLowerCase() ?? "";
    const close = tok.startsWith("</");

    if (tag === "img" || tag === "hr") continue; // 无文字语义，剔除
    if (tag === "br" && !close) {
      seg += "\n"; // 段内软换行
      continue;
    }
    if (tag === "pre") {
      if (close) {
        pushPar();
        inPre = false;
      } else {
        if (seg.trim()) pushPar();
        inPre = true;
      }
      continue;
    }
    if (tag === "p" || tag === "h2" || tag === "h3" || tag === "blockquote") {
      /* TipTap li 内容为 li>p 包裹：列表内 p 不打断列表项（否则「• 前缀」段会被提前推出） */
      if (listStack.length === 0) {
        if (close) pushPar();
        else if (seg.trim()) pushPar();
      }
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      if (close) {
        listStack.pop();
        olCounters.pop();
      } else {
        listStack.push(tag);
        olCounters.push(1);
      }
      continue;
    }
    if (tag === "li") {
      if (close) {
        pushPar();
        liDepth = Math.max(0, liDepth - 1);
      } else {
        if (seg.trim()) pushPar(); // 父 li 已累积文字（嵌套列表场景）先收段
        liDepth += 1;
        seg = listItemMarker(listStack, olCounters);
      }
      continue;
    }
    /* 行内标签剥壳（标签字符不进入 seg）；未知标签忽略 */
    if (INLINE_TAGS.has(tag) || close) continue;
  }
  pushPar();

  /* 段间分隔：后一段是列表项 → 单换行（引导句紧贴列表、列表项间紧凑）；
     后一段为普通段落 → 空行（段落节奏；含列表结束回到正文场景） */
  let out = "";
  for (let i = 0; i < paras.length; i++) {
    if (i > 0) out += paras[i].li ? "\n" : "\n\n";
    out += paras[i].text;
  }
  return out;
}

/** 当前列表项前缀（缩进 + 符号/序号），进入 li 文本前调用；ol 序号递增 */
function listItemMarker(stack: Array<"ul" | "ol">, counters: number[]): string {
  const depth = Math.max(0, stack.length - 1);
  const indent = "  ".repeat(depth);
  const kind = stack[stack.length - 1];
  if (kind === "ol") {
    const n = counters[counters.length - 1] ?? 1;
    counters[counters.length - 1] = n + 1;
    return `${indent}${n}. `;
  }
  return `${indent}• `;
}

/**
 * 帖子「复制内容」最终文本（作者内容本体，纯文本）
 * 组装规则：
 * 1. body = 富文本保结构转纯文本 / 纯文本帖原样（trim）
 * 2. 显式标题非空且正文首行（折叠空白后）不等于标题 → 标题独立成首行；
 *    正文首行即标题（页面允许 H1 与正文首行同文）→ 正文原样输出，避免标题两遍
 * 3. url 非空且正文未含该链接 → 末尾附加裸 URL 行（纯分享帖防链接丢失）
 * 4. 全部为空 → 返回 ""（调用方提示无可复制文字）
 */
export function postCopyText(input: { title?: string; content: string; url?: string }): string {
  const fold = (s: string) => s.replace(/\s+/g, " ").trim();
  const body = isRichText(input.content) ? richTextToPlainText(input.content) : input.content.trim();

  /* 标题置首行规则：正文首行（折叠空白后）恰等于标题 → 正文已含标题，原样输出即可（head 留空防重复）；
     否则标题独立成首行。页面允许 H1 与正文首行同文，复制时避免标题出现两遍 */
  let head = "";
  const t = (input.title ?? "").trim();
  if (t) {
    const nl = body.indexOf("\n");
    const firstLine = nl === -1 ? body : body.slice(0, nl);
    if (!(firstLine && fold(firstLine) === fold(t))) head = t;
  }

  let out = head && body ? `${head}\n\n${body}` : head || body;
  const url = (input.url ?? "").trim();
  if (url && !out.includes(url)) {
    out = out ? `${out}\n\n${url}` : url;
  }
  return out;
}
