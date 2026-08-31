import { describe, expect, it } from "vitest";
import { toCommentDTO } from "@/lib/queries-comments";
import { toSquarePostDTO } from "@/lib/queries-posts";
import type { CommentRow } from "@/lib/queries-comments";
import type { SquarePostRow } from "@/lib/queries-posts";

describe("toSquarePostDTO（广场帖子映射）", () => {
  const row: SquarePostRow = {
    id: "s1",
    content: "推荐一个好用的 AI 工具",
    post_type: "opportunity",
    commission: "分佣 10%",
    source_platform: null,
    category: "工具",
    tags: ["AI"],
    url: null,
    image_url: null,
    gallery: null,
    views: 5,
    likes_count: 3,
    comments_count: 0,
    created_at: "2026-08-23T00:00:00.000Z",
    featured_until: null,
    users: { id: "u2", name: "张三", avatar_url: "a.png", badge: null },
  };

  it("字段映射正确", () => {
    const dto = toSquarePostDTO(row);
    expect(dto.content).toBe("推荐一个好用的 AI 工具");
    expect(dto.postType).toBe("opportunity");
    expect(dto.commission).toBe("分佣 10%");
    expect(dto.category).toBe("工具");
    expect(dto.authorName).toBe("张三");
  });

  it("024 展示位：未置顶 featured=false", () => {
    expect(toSquarePostDTO(row).featured).toBe(false);
  });

  it("024 展示位：置顶中 featured=true，过期回落 false", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const past = new Date(Date.now() - 3600_000).toISOString();
    expect(toSquarePostDTO({ ...row, featured_until: future }).featured).toBe(true);
    expect(toSquarePostDTO({ ...row, featured_until: past }).featured).toBe(false);
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
