/**
 * postHeadline 标题提炼启发式单测（2026-08-31，P0-1）：
 * 覆盖 L1 用户标题优先/截断、L2 开场白剥离 + 品牌词/域名实体 + 修饰短语、L3 分类组合、
 * L4 作者兜底、富文本/纯文本等价、不编造断言。
 */
import { describe, expect, it } from "vitest";
import { postHeadline, CATEGORY_PHRASE } from "@/lib/post-title";

/** 构造最小入参的帮手 */
function opts(overrides: Partial<Parameters<typeof postHeadline>[0]> = {}) {
  return {
    content: "",
    category: "工具",
    authorName: "山川",
    postType: "share",
    ...overrides,
  };
}

describe("L1 用户标题", () => {
  it("用户标题优先，不加工不覆盖", () => {
    expect(
      postHeadline(
        opts({
          title: "我的 Tripo 上手体验",
          content: "好物分享。Tripo 是一款 AI 3D 建模工具",
        }),
      ),
    ).toBe("我的 Tripo 上手体验");
  });

  it("用户标题超长截断到 40 码点并追加省略号", () => {
    const result = postHeadline(opts({ title: "长".repeat(50), content: "正文" }));
    expect(Array.from(result).length).toBe(41);
    expect(result.endsWith("…")).toBe(true);
  });

  it("用户标题空白时不触发 L1，落到 L2 提炼", () => {
    expect(postHeadline(opts({ title: "   ", content: "Tripo 是一款 AI 建模工具" }))).toBe(
      "Tripo：AI 建模工具推荐",
    );
  });
});

describe("L2 实体标题", () => {
  it("剥离开场白 + 品牌词实体 + 行业词修饰短语（用户示例）", () => {
    const content = "好物分享。最近发现一个很好用的 AI 3D 建模工具 Tripo，可以通过文字生成 3D 模型。";
    const title = postHeadline(opts({ content }));
    expect(title).toBe("Tripo：AI 3D 建模工具推荐");
    /* 不编造断言：实体与修饰短语（除系统「推荐」尾缀）必须来自原文 */
    const [entity, modPart] = title.split("：");
    expect(content).toContain(entity);
    const modifier = modPart.endsWith("推荐") ? modPart.slice(0, -2) : modPart;
    expect(content).toContain(modifier);
  });

  it("实体在句首时，从实体后行业词窗口提取修饰短语", () => {
    expect(
      postHeadline(opts({ content: "Tripo 是一款 AI 3D 建模工具，文字生成 3D 模型。" })),
    ).toBe("Tripo：AI 3D 建模工具推荐");
  });

  it("无品牌词时回退 URL 域名实体（正文裸 URL）", () => {
    expect(
      postHeadline(opts({ content: "推荐一个网站 https://kitkit.ai/agent 很强大。" })),
    ).toBe("Kitkit：实用工具推荐");
  });

  it("存量 url 字段兜底域名实体（正文无 URL 无品牌词）", () => {
    expect(
      postHeadline(opts({ content: "很棒的服务，强烈推荐。", url: "https://www.notion.com/product" })),
    ).toBe("Notion：实用工具推荐");
  });

  it("行业词（AI/App）不作为品牌实体，继续找下一个；修饰短语截断到最后行业词（防动词混入）", () => {
    expect(postHeadline(opts({ content: "AI 工具里最推荐 Notion，笔记体验很好。" }))).toBe(
      "Notion：AI 工具推荐",
    );
  });

  it("开场白剥离不影响实体提取（最长前缀优先）", () => {
    const title = postHeadline(opts({ content: "今天分享一个 Tripo，很好用。" }));
    expect(title.startsWith("Tripo")).toBe(true);
    expect(title).not.toContain("今天分享");
  });
});

describe("L3 分类组合", () => {
  it("无实体无 URL 时用分类短语", () => {
    expect(
      postHeadline(opts({ content: "最近用了几个不错的效率软件，都挺轻量的。" })),
    ).toBe(CATEGORY_PHRASE["工具"]);
  });
});

describe("L4 作者兜底", () => {
  it("空正文（纯图帖）→ 作者 + 内容类型", () => {
    expect(postHeadline(opts({ content: "" }))).toBe("山川 的分享");
  });

  it("category=其他 且无实体 → 落 L4（不产出无区分度的「内容精选」）", () => {
    expect(postHeadline(opts({ content: "随便聊聊最近的事。", category: "其他" }))).toBe("山川 的分享");
  });

  it("opportunity 类型 → 内容类型标签为「机会」", () => {
    expect(postHeadline(opts({ content: "", postType: "opportunity" }))).toBe("山川 的机会");
  });
});

describe("输入形态等价", () => {
  it("富文本与纯文本产出相同 title", () => {
    const rich = postHeadline(
      opts({ content: "<p>好物分享。Tripo 是一款 <strong>AI 3D 建模工具</strong>。</p>" }),
    );
    const plain = postHeadline(opts({ content: "好物分享。Tripo 是一款 AI 3D 建模工具。" }));
    expect(rich).toBe(plain);
  });
});
