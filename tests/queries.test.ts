import { describe, expect, it } from "vitest";
import { toCommentDTO } from "@/lib/queries/comments";
import { toSquarePostDTO } from "@/lib/queries/posts";
import type { CommentRow } from "@/lib/queries/comments";
import type { SquarePostRow } from "@/lib/queries/posts";

describe("toSquarePostDTO（广场帖子映射）", () => {
  const row: SquarePostRow = {
    id: "s1",
    content: "推荐一个好用的 AI 工具",
    title: null,
    post_type: "opportunity",
    commission: "分佣 10%",
    source_platform: null,
    category: "工具",
    tags: ["AI"],
    url: null,
    image_url: null,
    gallery: null,
    likes_count: 3,
    comments_count: 0,
    created_at: "2026-08-23T00:00:00.000Z",
    users: { id: "u2", name: "张三", avatar_url: "a.png", badge: null },
  };

  it("字段映射正确", () => {
    const dto = toSquarePostDTO(row);
    expect(dto.content).toBe("推荐一个好用的 AI 工具");
    expect(dto.title).toBeUndefined();
    expect(dto.postType).toBe("opportunity");
    expect(dto.commission).toBe("分佣 10%");
    expect(dto.category).toBe("工具");
    expect(dto.authorName).toBe("张三");
  });

  it("2026-09-02 A：preview 服务端生成（纯文本折叠截断；富文本剥标签）", () => {
    /* 纯文本短帖：preview 即正文 */
    expect(toSquarePostDTO(row).preview).toBe("推荐一个好用的 AI 工具");
    /* 富文本帖：标签剥除、换行折叠为空格 */
    const rich = toSquarePostDTO({ ...row, content: "<p>你好<b>世界</b></p>\n<p>第二行</p>" });
    expect(rich.preview).toBe("你好 世界 第二行");
    /* 超 160 字截断 */
    const long = toSquarePostDTO({ ...row, content: "字".repeat(300) });
    expect(long.preview.length).toBe(160);
  });

  it("2026-09-02 A：{ content: false } 剥离正文全文（大列表路径），preview 仍在", () => {
    const listDto = toSquarePostDTO(row, { content: false });
    expect(listDto.content).toBe("");
    expect(listDto.preview).toBe("推荐一个好用的 AI 工具");
  });

  it("038 标题映射：非空 → title，空 → undefined", () => {
    expect(toSquarePostDTO({ ...row, title: "我的标题" }).title).toBe("我的标题");
    expect(toSquarePostDTO({ ...row, title: null }).title).toBeUndefined();
  });
});

describe("toCommentDTO（评论映射）", () => {
  const row: CommentRow = {
    id: "c1",
    content: "不错，收藏了",
    likes: 3,
    created_at: "2026-08-23T00:00:00.000Z",
    users: { id: "u3", name: "李四", avatar_url: null },
  };

  it("字段映射正确", () => {
    const dto = toCommentDTO(row);
    expect(dto.content).toBe("不错，收藏了");
    expect(dto.likes).toBe(3);
    expect(dto.authorName).toBe("李四");
  });
});
