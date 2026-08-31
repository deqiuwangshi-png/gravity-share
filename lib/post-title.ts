/**
 * SEO 标题提炼启发式（2026-08-31，P0-1）：
 * 四级流水线 L1 用户标题 → L2 实体标题（剥开场白 + 品牌词/域名实体 + 行业词修饰短语）→ L3 分类组合 → L4 作者兜底。
 * 纯函数（无 I/O）；SEO title 与页面 H1 同源消费（详情页 generateMetadata 与 <h1> 引用同一函数输出）。
 * 六条硬约束：不覆盖用户标题 / 不关键词堆砌 / 不凭空编造（title 词均来自原文或 CATEGORY_PHRASE 系统映射）/
 * 不改变用户原始内容（存库零改动）/ title 与 H1 一致 / ≤40 字符（Unicode 码点）。
 */
import { stripHtml, safeName, URL_PATTERN } from "@/lib/text";

/** SEO 标题长度上限（Unicode 码点，超长截断追加省略号） */
const MAX_LEN = 40;

/** 低信息量开场白（startsWith 匹配；数组按长度降序 → 最长优先剥除；命中后不再参与实体提取） */
const LOW_INFO_PREFIXES = [
  "今天分享一个", "给大家推荐", "给大家分享", "好物分享", "好物推荐",
  "推荐一下", "推荐一个", "推荐一款", "分享一个", "分享一款", "分享一下",
  "安利一个", "安利一下", "记录一下", "随手记录", "随便聊聊", "聊一下",
  "发现一个", "发现一款", "最近发现", "推一个", "说一个", "看到一款",
  "偶然发现", "无意中看到",
] as const;

/** 行业词：① 排除品牌词误命中（AI/App/API 等）② 修饰短语提取的语义锚点 */
const INDUSTRY_TERMS = [
  "AI", "API", "UI", "UX", "SaaS", "SEO", "ERP", "3D",
  "人工智能", "工具", "软件", "应用", "App", "平台", "网站", "服务",
  "教程", "课程", "学习", "知识库", "模型", "设计", "资源", "素材",
  "代码", "开源", "项目", "框架", "插件", "脚本", "模板", "社区",
  "作品", "活动", "机会", "产品", "功能", "体验", "评测", "接口", "助手",
] as const;

/** 修饰短语尾部虚词（按长度降序；while 循环剥一层再查一层，如「很好用的」→「很好用」） */
const VAGUE_WORDS = [
  "非常好用的", "超级好用的", "很好用的", "超好用", "非常好用",
  "很好用", "一个", "一款", "最近", "的", "个", "很", "超",
] as const;

/** 分类 → 展示短语（L2 修饰回退 / L3 组合；导出供单测断言「不编造」） */
export const CATEGORY_PHRASE: Record<string, string> = {
  工具: "实用工具推荐",
  技术: "技术分享",
  行业: "行业动态",
  项目: "项目推荐",
  资源: "资源推荐",
  作品: "作品分享",
  学习: "学习资源推荐",
  博客: "深度文章推荐",
  交易: "机会信息",
  地区: "本地资讯",
  情感: "交流话题",
  其他: "内容精选",
};

/** 发布性质 → 内容类型标签（L4 兜底用） */
const TYPE_LABEL: Record<string, string> = {
  share: "分享",
  opportunity: "机会",
  content: "内容",
};

/** 品牌词实体：首字符大写的英文字符串（跳过行业词，如 AI/App/API 等） */
const BRAND_RE = /\b[A-Z][A-Za-z0-9]{1,29}(?:[-.][A-Za-z0-9]{1,29})*\b/g;

/** 截断到 MAX_LEN（Unicode 码点），超长追加省略号 */
function truncate(s: string): string {
  const chars = Array.from(s);
  return chars.length <= MAX_LEN ? s : `${chars.slice(0, MAX_LEN).join("")}…`;
}

/** 从正文提取第一个外部链接：优先富文本 <a href>，其次纯文本裸 URL */
function firstExternalUrl(content: string): string | null {
  const anchor = content.match(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/i);
  if (anchor) return anchor[1];
  const bare = stripHtml(content).match(URL_PATTERN);
  return bare ? bare[0] : null;
}

/** hostname → 实体名：去 www.、去 TLD、分段首字母大写（kitkit.ai → Kitkit；kitkit-agent.com → Kitkit-Agent） */
function entityFromHostname(hostname: string): string {
  const host = hostname.toLowerCase().replace(/^www\./, "").replace(/\.[a-z0-9]+$/, "");
  return host
    .split(/[.-]/)
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join("-");
}

/** URL 兜底实体：正文首个外链（<a> 或裸 URL，其次存量 url 字段）→ hostname 实体；无外链返回 null */
function entityFromUrl(content: string, url?: string): string | null {
  const external = firstExternalUrl(content) ?? (url && /^https?:\/\//i.test(url) ? url : null);
  if (!external) return null;
  try {
    const hostname = new URL(external).hostname;
    return hostname ? entityFromHostname(hostname) : null;
  } catch {
    return null;
  }
}

/** 正文品牌词实体：首字符大写英文串中第一个非行业词（跳过 AI/App 等） */
function findBrandEntity(body: string): string | null {
  for (const m of body.matchAll(BRAND_RE)) {
    const word = m[0];
    if ((INDUSTRY_TERMS as readonly string[]).includes(word)) continue;
    if (Array.from(word).length < 2) continue;
    return word;
  }
  return null;
}

/**
 * 修饰短语：以「最靠前行业词」为起点，终点优先级：
 *   ① 实体在行业词后 → 止于实体前（「…很好用的 AI 3D 建模工具 Tripo」→ AI 起 → 止 Tripo 前 →「AI 3D 建模工具」）
 *   ② 实体在行业词前 → 止于其后最后一个行业词末尾（「Tripo 是一款 AI 3D 建模工具」→ AI 起 → 工具末 →「AI 3D 建模工具」）
 *   ③ 无后续行业词 → 止于下一标点（限 12 字符内，无标点则向后扩 8）
 * 尾部清洗 VAGUE_WORDS；空 / 超长（>15 码点）视为无效 → 调用方回退 CATEGORY_PHRASE
 */
function modifierPhrase(body: string, entity: string): string | null {
  const entityIdx = body.indexOf(entity);
  if (entityIdx < 0) return null;
  const start = Math.max(0, entityIdx - 16);
  const end = Math.min(body.length, entityIdx + 24);
  const region = body.slice(start, end);
  const relEntity = entityIdx - start;

  const hits: Array<{ term: string; pos: number }> = [];
  for (const term of INDUSTRY_TERMS) {
    let from = 0;
    let pos = region.indexOf(term, from);
    while (pos >= 0) {
      hits.push({ term, pos });
      from = pos + 1;
      pos = region.indexOf(term, from);
    }
  }
  if (hits.length === 0) return null;
  hits.sort((a, b) => a.pos - b.pos);
  const first = hits[0];

  let endRel: number;
  if (relEntity > first.pos) {
    /* ① 实体在行业词后：起点为最靠前行业词；终点 = 实体前，但截断到「起点后、实体前最后一个行业词末尾」
     * （防动词/虚词混入：如「AI 工具里最推荐 Notion」→ 止于「工具」末尾 →「AI 工具」；
     *   而「…AI 3D 建模工具 Tripo」→ 工具紧邻实体前 → 止于工具末尾即全长） */
    const inRange = hits.filter((h) => h.pos > first.pos && h.pos < relEntity);
    const lastEnd =
      inRange.length > 0
        ? inRange[inRange.length - 1].pos + inRange[inRange.length - 1].term.length
        : first.pos + first.term.length;
    endRel = Math.min(relEntity, lastEnd);
  } else {
    /* ②③ 实体在行业词前（或与实体同段）：取其后最后一个行业词末尾；无则标点边界 */
    const later = hits.filter((h) => h.pos > first.pos);
    if (later.length > 0) {
      const last = later[later.length - 1];
      endRel = last.pos + last.term.length;
    } else {
      const after = region.slice(first.pos + first.term.length, first.pos + first.term.length + 12);
      const punct = after.search(/[，。！？；、,.!?;]/);
      endRel = first.pos + first.term.length + (punct >= 0 ? punct : Math.min(after.length, 8));
    }
  }

  let modifier = region.slice(first.pos, endRel).trim();
  /* 尾部虚词清洗（剥一层可能露出下一层） */
  let changed = true;
  while (changed) {
    changed = false;
    for (const vague of VAGUE_WORDS) {
      if (modifier.endsWith(vague)) {
        modifier = modifier.slice(0, -vague.length).trim();
        changed = true;
        break;
      }
    }
  }
  modifier = modifier.replace(/^[，,。.\s]+|[，,。.\s]+$/g, "").trim();
  if (!modifier || Array.from(modifier).length > 15) return null;
  return modifier;
}

/**
 * SEO 标题提炼（四级流水线，纯函数）：
 * L1 用户标题 → L2 实体标题（品牌词 > 域名实体；修饰短语[正文行业词窗口]或分类短语，追加「推荐」）→
 * L3 分类组合（「其他」无区分度 → 落 L4）→ L4 作者 + 内容类型兜底
 */
export function postHeadline(opts: {
  /** 用户标题（D1：发布/编辑表单可选；非空直接采用，不加工不覆盖） */
  title?: string;
  /** 正文（富文本 HTML 或纯文本） */
  content: string;
  /** 12 分类之一 */
  category: string;
  /** 预留：未来可参与组合；当前不使用（避免堆砌） */
  tags?: string[];
  /** 外链（存量帖 url 字段；新帖恒 null，链接由正文 <a> 承载） */
  url?: string;
  authorName: string;
  postType: string;
}): string {
  const { title, content, category, url, authorName, postType } = opts;

  /* L1 用户标题（不加工、不覆盖，仅长度保护） */
  if (title && title.trim()) return truncate(title.trim());

  const plain = stripHtml(content).replace(/\s+/g, " ").trim();
  /* 空正文（纯图帖）→ L4 作者兜底 */
  if (!plain) return `${safeName(authorName)} 的${TYPE_LABEL[postType] ?? "分享"}`;

  /* L2 剥低信息量开场白（最长优先，命中即止） */
  let body = plain;
  for (const prefix of LOW_INFO_PREFIXES) {
    if (body.startsWith(prefix)) {
      body = body.slice(prefix.length).trim();
      break;
    }
  }

  /* L2 实体标题：品牌词实体 > 域名实体 */
  const entity = findBrandEntity(body) ?? entityFromUrl(content, url);
  if (entity) {
    const extracted = modifierPhrase(body, entity);
    const modifier = extracted ?? CATEGORY_PHRASE[category];
    return truncate(extracted ? `${entity}：${extracted}推荐` : `${entity}：${modifier}`);
  }

  /* L3 分类组合（「其他」无区分度 → 落 L4） */
  const phrase = CATEGORY_PHRASE[category];
  if (phrase && category !== "其他") return phrase;

  /* L4 作者 + 内容类型兜底 */
  return `${safeName(authorName)} 的${TYPE_LABEL[postType] ?? "分享"}`;
}
