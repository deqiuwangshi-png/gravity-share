import { describe, expect, it } from "vitest";
import { toCommentDTO } from "@/lib/queries/comments";
import { selectRelatedSquarePosts, toSquarePostDTO } from "@/lib/queries/posts";
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

describe("selectRelatedSquarePosts（相关文章规则）", () => {
  const post = (id: string, category: string): SquarePostRow => ({
    id,
    content: id,
    title: null,
    post_type: "share",
    commission: null,
    source_platform: null,
    category,
    tags: [],
    url: null,
    image_url: null,
    gallery: null,
    likes_count: 0,
    comments_count: 0,
    created_at: "2026-08-23T00:00:00.000Z",
    url_status: "normal",
    users: null,
  });
  const dto = (id: string, category: string) => toSquarePostDTO(post(id, category), { content: false });

  it("同分类达到 4 条时只返回同分类，最多 6 条", () => {
    const same = Array.from({ length: 7 }, (_, index) => dto(`same-${index}`, "工具"));
    const others = [dto("other-1", "技术")];
    expect(selectRelatedSquarePosts(same, others).map((item) => item.id)).toEqual([
      "same-0",
      "same-1",
      "same-2",
      "same-3",
      "same-4",
      "same-5",
    ]);
  });

  it("同分类不足 4 条时按顺序补充其他分类", () => {
    const same = [dto("same-1", "工具"), dto("same-2", "工具")];
    const others = [dto("other-1", "技术"), dto("other-2", "项目"), dto("other-3", "资源"), dto("other-4", "作品")];
    expect(selectRelatedSquarePosts(same, others).map((item) => item.id)).toEqual([
      "same-1",
      "same-2",
      "other-1",
      "other-2",
      "other-3",
      "other-4",
    ]);
  });
});
