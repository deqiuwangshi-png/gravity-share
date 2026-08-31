/**
 * 发布弹窗（client，2026-08-27 三入口合并改版；2026-08-29 正文升级轻量富文本）
 * 分享 / 机会 / 内容 三入口 → 单一表单 + 两个可选标注（产品决策：发布性质从「必选入口」降级为「可选标注」）
 * 统一发布到广场（square_posts）——广场 = 全量供给池，首页从广场精选推荐
 * 表单字段：正文（必填，RichEditor compact：B/斜体/列表/链接/图片，工具栏常显；图片多选进图集条，第 1 张自动作封面）+ 内容分类（12 选 1 默认「其他」）
 * 链接（2026-08-29 收口）：移除独立「链接」字段——链接统一由富文本正文 <a> 承载（url 字段新帖恒 null）
 * 可选标注（默认都不勾，post_type 由标注映射，库结构不变，015 CHECK 不破）：
 *   ① 推广/有利益关系 → 勾选后必填利益披露 → 帖子标记「机会」（post_type=opportunity，合规必需）
 *   ② 我的原创内容 → 勾选后选来源平台 → 帖子标记「内容」（post_type=content）
 *   都不勾 → 普通分享（post_type=share）
 * 安全：正文 HTML 入库前 sanitizeHtml（DOMPurify 白名单主防线），字数按纯文本（stripHtml）≤2000 校验
 * 提交成功后 dispatch SQUARE_UPDATED_EVENT，广场重新拉取（刷新不丢）
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { SQUARE_CATEGORIES, SOURCE_PLATFORMS, SQUARE_POST_TYPES } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { SQUARE_UPDATED_EVENT } from "@/lib/events";
import { extractTags, stripHtml } from "@/lib/text";
import { sanitizeHtml } from "@/lib/rich-content";
import { RichEditor } from "@/components/app/common/rich-editor";
import { removeImage } from "@/lib/storage";

/* A2 修复（2026-08-23）：post_type 由 SQUARE_POST_TYPES 枚举驱动（与迁移 015 CHECK 同源），不再写死字面量 */
const [PT_SHARE, PT_OPPORTUNITY, PT_CONTENT] = SQUARE_POST_TYPES;

export default function PublishModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  /* 提交错误文案（空 = 无错误） */
  const [submitError, setSubmitError] = useState("");

  /* 共用字段：正文 = 富文本 HTML（轻量格式：B/斜体/列表/链接） */
  const [html, setHtml] = useState("");
  const [category, setCategory] = useState<string>("其他");
  /* 可选标注 ①：推广 / 有利益关系（勾选后披露必填，合规必需） */
  const [isPromo, setIsPromo] = useState(false);
  const [commission, setCommission] = useState("");
  /* 可选标注 ②：我的原创内容（勾选后选来源平台） */
  const [isOriginal, setIsOriginal] = useState(false);
  const [sourcePlatform, setSourcePlatform] = useState("");
  /* 图片（2026-08-31 图集化）：多图经 RichEditor 图集条上传，第 1 张自动作封面（image_url）
   * 原表单单张「配图」区已移除（被图集条取代，DoD ② 删除被取代代码） */
  const [galleryPaths, setGalleryPaths] = useState<string[]>([]);
  /* 上传路径前缀：弹窗打开即固定 draftId，上传与提交共用 → posts/{uid}/{draftId}/… 路径一致 */
  const [draftId] = useState(() => newId("s"));
  /* 当前用户 id（上传凭证用；app 区需登录，挂载后很快可得） */
  const [uid, setUid] = useState("");
  /* 提交成功标记：未提交就关闭弹窗 → 清理已上传图片（孤儿文件兜底） */
  const submittedRef = useRef(false);
  /* 提交中状态（防重复提交：ref 同步锁 + state 驱动按钮禁用/文案） */
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUid(data.user.id);
    });
  }, []);

  /** 编辑器上传成功列表回调（稳定引用，避免 RichEditor effect 反复触发） */
  const onGalleryChange = useCallback((paths: string[]) => setGalleryPaths(paths), []);

  /** 关闭弹窗（未提交成功时清理本次上传的图片，防孤儿文件） */
  function handleClose() {
    if (!submittedRef.current) {
      galleryPaths.forEach((path) => void removeImage("post", path).catch(() => {}));
    }
    onClose();
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** 生成防重复短 id（同毫秒连发也唯一） */
  function newId(prefix: string): string {
    return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  /* 两个标注互斥：一个帖子要么推广、要么原创、要么普通分享（post_type 三选一） */
  function togglePromo(v: boolean) {
    setIsPromo(v);
    if (v) setIsOriginal(false);
  }

  function toggleOriginal(v: boolean) {
    setIsOriginal(v);
    if (v) setIsPromo(false);
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    /* 防重复提交（2026-08-31 BUG 修复）：ref 同步锁，双击/连点只放行一次；
     * 必须用 ref 而非 state——state 更新有渲染延迟，两次快速点击可能都读到旧值 */
    if (submittingRef.current) return;
    /* 富文本：剥标签取纯文本做校验与提取（HTML 标签不计入 2000 字感知）
     * 空校验放宽（2026-08-31）：允许纯图片帖——正文与图集都为空才拦截，且给出明确提示（不再静默） */
    const plain = stripHtml(html);
    if (!plain && galleryPaths.length === 0) {
      setSubmitError("写点内容或添加图片后再发布");
      return;
    }
    if (plain.length > 2000) {
      setSubmitError("内容过长（最多 2000 字）");
      return;
    }
    setSubmitError("");
    /* 合规红线：勾选推广必须披露利益关系，否则拦截 */
    if (isPromo && !commission.trim()) {
      setSubmitError("勾选了推广/有利益关系，请填写利益披露（如返佣比例、奖励内容）");
      return;
    }
    /* 全部同步校验通过后才上锁（校验失败 return 不影响下次点击） */
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const id = draftId;
      /* 封面 = 图集第 1 张（图集已由 RichEditor 上传完毕，path 前缀 posts/{uid}/{draftId}/…） */
      const imageUrl = galleryPaths[0] ?? undefined;
      const base = {
        id,
        author_id: user.id,
        /* 主防线：入库前 DOMPurify 白名单清洗（渲染端另有二次清洗纵深） */
        content: sanitizeHtml(html),
        category,
        tags: extractTags(plain),
        /* 2026-08-29 收口：独立链接字段已移除，新帖 url 恒 null（链接统一由正文 <a> 承载） */
        url: null,
        image_url: imageUrl ?? null,
      };
      /* 标注映射 post_type（015 CHECK 约束三值，库结构不变） */
      const extra = isPromo
        ? { post_type: PT_OPPORTUNITY, commission: commission.trim() || null, source_platform: null }
        : isOriginal
          ? { post_type: PT_CONTENT, source_platform: sourcePlatform || null, commission: null }
          : { post_type: PT_SHARE, commission: null, source_platform: null };
      const { error } = await supabase.from("square_posts").insert({ ...base, ...extra });
      if (error) {
        /* BUG-14 扩展：insert 失败回滚本次上传的全部图片，避免孤儿文件 */
        galleryPaths.forEach((path) => void removeImage("post", path).catch(() => {}));
        setSubmitError("发布失败，请重试");
        return;
      }
      submittedRef.current = true;
      window.dispatchEvent(new Event(SQUARE_UPDATED_EVENT));
      /* 方案 B（2026-08-29）：发布成功即关弹窗并跳到新帖详情页——省掉"已发布/完成"冗余确认态 */
      onClose();
      router.push(`/square/${id}`);
      router.refresh();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="publish-title" onClick={handleClose}>
      <div className="modal-box publish-box" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2 id="publish-title">发布</h2>
          <button type="button" onClick={handleClose} aria-label="关闭"><X size={16} /></button>
        </div>

        <form className="publish-immersive" onSubmit={handleSubmit}>
            {/* 轻量富文本正文（compact：工具栏常显 B/斜体/列表/链接/图片；图片多选进图集条，第 1 张自动作封面） */}
            <RichEditor compact value={html} onChange={setHtml} upload={uid ? { userId: uid, postId: draftId } : undefined} onUploadedChange={onGalleryChange} />

            {/* 可选标注（并排单行胶囊，悬浮 title 详细说明；勾选后展开披露/来源） */}
            <div className="publish-toggles">
              <label
                className={`publish-toggle${isPromo ? " on" : ""}`}
                title="含返佣、奖励、分佣等利益关系；勾选后需填写披露，帖子显示「机会」标识"
              >
                <input type="checkbox" checked={isPromo} onChange={(event) => togglePromo(event.target.checked)} />
                <span>包含推广/返佣信息</span>
              </label>
              <label
                className={`publish-toggle${isOriginal ? " on" : ""}`}
                title="你在别处创作的内容（博客 / 视频 / 作品集…），可标注来源平台"
              >
                <input type="checkbox" checked={isOriginal} onChange={(event) => toggleOriginal(event.target.checked)} />
                <span>我的原创内容</span>
              </label>
            </div>
            {isPromo && (
              <div className="publish-toggle-sub">
                <label className="publish-field">
                  <span>利益披露 <i className="publish-optional">必填</i></span>
                  <input type="text" value={commission} onChange={(event) => setCommission(event.target.value)} placeholder="如：邀请返佣比例、分佣比例、积分奖励等利益关系" aria-label="利益披露" />
                </label>
                <p className="publish-warning">推广内容含利益关系，请如实披露；平台将加官方「机会」标识，帮助用户识别。</p>
              </div>
            )}
            {isOriginal && (
              <div className="publish-toggle-sub">
                <label className="publish-field">
                  <span>来源平台 <i className="publish-optional">选填</i></span>
                  <select value={sourcePlatform} onChange={(event) => setSourcePlatform(event.target.value)} aria-label="来源平台">
                    <option value="">不标注</option>
                    {SOURCE_PLATFORMS.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {/* 内容分类（固定枚举，默认「其他」可改；分类是内容属性，与 #标签 分离） */}
            <div className="publish-field publish-type-field">
              <span>分类</span>
              <div className="publish-chips">
                {SQUARE_CATEGORIES.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className={`publish-chip${category === name ? " active" : ""}`}
                    onClick={() => setCategory(name)}
                  >{name}</button>
                ))}
              </div>
            </div>

            {submitError && <p className="publish-error" role="alert">{submitError}</p>}
            <button className="publish-immersive-submit" type="submit" disabled={submitting}>
              {submitting ? "发布中…" : "发布"}
            </button>
          </form>
      </div>
    </div>
  );
}
