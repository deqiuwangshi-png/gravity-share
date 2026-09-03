/**
 * 复制内容工具单测（2026-09-03 C）——richTextToPlainText 保结构转换 + postCopyText 组装规则
 */
import { describe, expect, it } from "vitest";
import { postCopyText, richTextToPlainText } from "@/lib/content-text";

describe("richTextToPlainText（富文本 → 保结构纯文本，复制用）", () => {
  it("段落间空行、br 段内换行、实体解码", () => {
    expect(richTextToPlainText("<p>第一行<br>第二行</p><p>&amp; &lt;tag&gt;</p>")).toBe(
      "第一行\n第二行\n\n& <tag>",
    );
  });

  it("h2 / blockquote 独立成段", () => {
    expect(richTextToPlainText("<h2>小标题</h2><p>正文</p><blockquote><p>引用</p></blockquote>")).toBe(
      "小标题\n\n正文\n\n引用",
    );
  });

  it("无序列表行前缀「• 」且列表项间单换行", () => {
    expect(richTextToPlainText("<ul><li><p>医学生</p></li><li><p>医生</p></li></ul>")).toBe(
      "• 医学生\n• 医生",
    );
  });

  it("有序列表递增序号", () => {
    expect(richTextToPlainText("<ol><li><p>第一步</p></li><li><p>第二步</p></li></ol>")).toBe(
      "1. 第一步\n2. 第二步",
    );
  });

  it("嵌套列表两空格缩进且紧凑无空行", () => {
    expect(
      richTextToPlainText("<ul><li><p>父项</p><ul><li><p>子项</p></li></ul></li><li><p>兄弟</p></li></ul>"),
    ).toBe("• 父项\n  • 子项\n• 兄弟");
  });

  it("img 整剔除、行内标签（strong/a）剥壳留文字", () => {
    expect(
      richTextToPlainText('<p>推荐 <strong>Tripo</strong>，详见 <a href="https://x.com">官网</a>。</p><img src="/a.png">'),
    ).toBe("推荐 Tripo，详见 官网。");
  });

  it("pre 代码保留缩进换行且实体解码", () => {
    expect(richTextToPlainText("<pre><code>const a = 1;\nif (a &lt; 2) {}\n</code></pre>")).toBe(
      "const a = 1;\nif (a < 2) {}",
    );
  });

  it("纯图帖（无文字）→ 空串", () => {
    expect(richTextToPlainText('<p></p><img src="/a.png"><p></p>')).toBe("");
  });
});

describe("postCopyText（帖子复制内容组装：标题 + 正文 + URL，纯文本）", () => {
  const rich =
    "<p>如果你正在学习医学、护理、药学等专业……</p><p>适合以下人群：</p><ul><li><p>医学生</p></li><li><p>医生</p></li><li><p>护士</p></li></ul>";

  it("用户示例：标题 + 富文本正文（首行不同文）→ 标题独立首行，列表保符号", () => {
    expect(postCopyText({ title: "医学英语口语知识库", content: rich })).toBe(
      "医学英语口语知识库\n\n如果你正在学习医学、护理、药学等专业……\n\n适合以下人群：\n• 医学生\n• 医生\n• 护士",
    );
  });

  it("正文首行与标题同文（页面 H1 同文惯例）→ 去重，标题只出现一遍", () => {
    const dup = "<p>医学英语口语知识库</p><p>如果你正在学习……</p>";
    expect(postCopyText({ title: "医学英语口语知识库", content: dup })).toBe(
      "医学英语口语知识库\n\n如果你正在学习……",
    );
  });

  it("纯文本帖首行即标题 → 去重且保留原换行", () => {
    const plain = "医学英语口语知识库\n如果你正在学习……";
    expect(postCopyText({ title: "医学英语口语知识库", content: plain })).toBe(
      "医学英语口语知识库\n如果你正在学习……",
    );
  });

  it("无标题 → 仅正文", () => {
    expect(postCopyText({ content: "<p>只有正文</p>" })).toBe("只有正文");
  });

  it("url 正文未含 → 末尾附加裸 URL；正文已含 → 不附加", () => {
    expect(postCopyText({ title: "好站", content: "<p>推荐这个</p>", url: "https://a.com/x" })).toBe(
      "好站\n\n推荐这个\n\nhttps://a.com/x",
    );
    expect(
      postCopyText({ title: "好站", content: '<p>推荐 <a href="https://a.com/x">https://a.com/x</a> 这个</p>', url: "https://a.com/x" }),
    ).toBe("好站\n\n推荐 https://a.com/x 这个");
  });

  it("纯图帖（正文无文字）→ 只输出标题；全空 → 空串", () => {
    expect(postCopyText({ title: "美图", content: '<p></p><img src="/a.png">' })).toBe("美图");
    expect(postCopyText({ content: "" })).toBe("");
    expect(postCopyText({ title: "", content: "<p></p>" })).toBe("");
  });
});
