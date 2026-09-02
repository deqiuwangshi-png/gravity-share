/**
 * 发布弹窗（client，2026-08-27 三入口合并改版；2026-08-29 正文升级轻量富文本；2026-08-31 移除可选标注）
 * 统一发布到广场（square_posts）——广场 = 全量供给池，首页从广场精选推荐
 * 表单字段：标题（必填，2026-09-02 由「可选」改必填——SEO L1 + 搜索/分享展示；纯图片帖也须填）+ 正文（必填，
 *   RichEditor compact：B/斜体/无序列表/图片，工具栏常显；链接由正文直接输入/粘贴自动识别，不再单设按钮；图片多选进图集条，第 1 张自动作封面）
 *   + 内容分类（12 选 1 默认「其他」）
 * 链接（2026-08-29 收口）：移除独立「链接」字段——链接统一由富文本正文 <a> 承载（url 字段新帖恒 null）
 * 标注（2026-08-31 移除）：「包含推广/返佣信息」「我的原创内容」两个复选框已删除（用户判定多余非必要），
 *   新帖统一 post_type=share（存量 opportunity/content 帖标识仍正常渲染，库字段 015 保留）
 * 安全：正文 HTML 入库前 sanitizeHtml（sanitize-html 白名单主防线，2026-09-02 由 DOMPurify 迁移），字数按纯文本（stripHtml）≤2000 校验
 * 提交成功后 dispatch SQUARE_UPDATED_EVENT，广场重新拉取（刷新不丢）
 * 交互保护（2026-09-02）：编辑器属持续交互态，关闭只由明确意图触发——X / Esc / 点遮罩统一走 attemptClose；
 *   dirty（标题/正文/图集任一非空）时先弹「放弃确认」，绝不因鼠标滑出/拖选越界/误触直关丢内容；
 *   遮罩用 onMouseDown + 目标自检（非 onClick 冒泡）——杜绝「编辑器内按下、遮罩上松手」的跨边界 click 误关。
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { SQUARE_CATEGORIES, SQUARE_POST_TYPES } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { SQUARE_UPDATED_EVENT } from "@/lib/events";
import { extractTags, stripHtml } from "@/lib/text";
import { sanitizeHtml } from "@/lib/rich-content";
import { RichEditor } from "@/components/app/common/rich-editor";
import { removeImage } from "@/lib/storage";

/* A2 修复（2026-08-23）：post_type 由 SQUARE_POST_TYPES 枚举驱动（与迁移 015 CHECK 同源），不再写死字面量；
 * 2026-08-31 移除可选标注后新帖恒为 PT_SHARE（存量 opportunity/content 帖保留渲染） */
const [PT_SHARE] = SQUARE_POST_TYPES;

/** 生成防重复短 id（同毫秒连发也唯一）；模块级纯函数（2026-08-31 修复：useState 初始化器引用须先于声明） */
function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export default function PublishModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  /* 提交错误文案（空 = 无错误） */
  const [submitError, setSubmitError] = useState("");

  /* 共用字段：正文 = 富文本 HTML（轻量格式：B/斜体/列表/图片，链接输入自动识别）；标题（038，2026-09-02 前端必填，SEO L1；库列仍可空兼容存量帖） */
  const [html, setHtml] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("其他");
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
  /* 交互保护（2026-09-02）：有未发布内容（dirty）时关闭须二次确认——禁止鼠标滑出/误触直关丢内容 */
  const [confirmClose, setConfirmClose] = useState(false);
  /* dirty = 标题/正文/图集任一非初始（纯改分类不拦截——空表单不值得确认）；
     提交成功后 submittedRef 置 true → dirty 归 false，发布跳转直关无确认 */
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDirty(!submittedRef.current && (title.trim() !== "" || stripHtml(html) !== "" || galleryPaths.length > 0));
  }, [title, html, galleryPaths]);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUid(data.user.id);
    });
  }, []);

  /** 编辑器上传成功列表回调（稳定引用，避免 RichEditor effect 反复触发） */
  const onGalleryChange = useCallback((paths: string[]) => setGalleryPaths(paths), []);

  /** 统一关闭入口（2026-09-02）：X / Esc / 点遮罩全走此守卫
   * dirty 时先弹放弃确认（继续编辑 = 保留现场），仅明确「放弃并关闭」才真正退出；
   * 提交中禁止关闭（防提交竞态——旧实现提交间隙点 X 会关弹窗丢请求） */
  function attemptClose() {
    if (submittingRef.current) return;
    if (dirty) {
      setConfirmClose(true);
      return;
    }
    doClose();
  }

  /** 真正关闭：未提交成功时清理本次上传的图片，防孤儿文件 */
  function doClose() {
    if (!submittedRef.current) {
      galleryPaths.forEach((path) => void removeImage("post", path).catch(() => {}));
    }
    onClose();
  }

  /* Esc = 明确取消意图，但同样过 dirty 守卫（无依赖数组：每次渲染重绑，保证监听器拿到最新 attemptClose/dirty） */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") attemptClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  /* 两个标注已移除（2026-08-31）：发布性质恒为普通分享，无互斥切换逻辑 */

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    /* 防重复提交（2026-08-31 BUG 修复）：ref 同步锁，双击/连点只放行一次；
     * 必须用 ref 而非 state——state 更新有渲染延迟，两次快速点击可能都读到旧值 */
    if (submittingRef.current) return;
    /* 标题必填（2026-09-02）：trim 为空即拦截——纯图片帖也须填标题（SEO L1 + 搜索/分享展示） */
    if (!title.trim()) {
      setSubmitError("请填写标题");
      return;
    }
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
        /* 主防线：入库前 sanitize-html 白名单清洗（渲染端另有二次清洗纵深） */
        content: sanitizeHtml(html),
        /* 038 标题必填（2026-09-02）：校验已拦空，恒写入 trim 结果（不再写 null；存量空标题帖不受影响） */
        title: title.trim(),
        category,
        tags: extractTags(plain),
        /* 2026-08-29 收口：独立链接字段已移除，新帖 url 恒 null（链接统一由正文 <a> 承载） */
        url: null,
        image_url: imageUrl ?? null,
        /* 037 图集：有序 storage path 数组（第 1 张 = 封面 image_url；正文纯文字不含图） */
        gallery: galleryPaths,
        /* 2026-08-31 移除可选标注：新帖统一普通分享（015 CHECK 三值，库结构不变）；
           commission/source_platform 不写入 → 默认 null（存量帖字段保留供渲染） */
        post_type: PT_SHARE,
      };
      const { error } = await supabase.from("square_posts").insert(base);
      if (error) {
        /* BUG-14 扩展：insert 失败回滚本次上传的全部图片，避免孤儿文件 */
        galleryPaths.forEach((path) => void removeImage("post", path).catch(() => {}));
        setSubmitError("发布失败，请重试");
        return;
      }
      submittedRef.current = true;
      /* D（2026-09-02 规模化分析）：事件携带新帖 id —— 列表监听方「拉单条插头 + 裁尾」增量刷新，
       * 替代旧的全量重拉 100 替换（消除重复请求与滚动跳变） */
      window.dispatchEvent(new CustomEvent(SQUARE_UPDATED_EVENT, { detail: { postId: id } }));
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
    /* 遮罩关闭（2026-09-02 修复）：onMouseDown + 目标自检——只有按下瞬间光标落在遮罩本体才算「点外部关闭」；
     * 编辑器内拖选文字滑出到遮罩松手的 click（派发到共同祖先）不再触发关闭（onClick 冒泡式会误关） */
    <div
      className="app-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) attemptClose();
      }}
    >
      {/* 面板壳：modal-box 宿主类仅承载 decor 阴影（0 30px 80px rgba(0,0,0,.15)，非令牌收容）；relative 为放弃确认覆盖层提供包含块（原 publish-box） */}
      <div className="modal-box relative w-[min(560px,100%)] min-w-0 rounded-card bg-surface p-7">
        <div className="mb-[25px] flex items-center justify-between">
          <h2 id="publish-title" className="m-0 text-[20px]">发布</h2>
          <button type="button" onClick={attemptClose} aria-label="关闭" className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border-0 bg-hover text-muted"><X size={16} /></button>
        </div>

        <form className="grid grid-cols-[minmax(0,1fr)] gap-[18px]" onSubmit={handleSubmit}>
            {/* 标题（038）：必填（2026-09-02）；SEO 标题提炼 L1 优先使用（存量空标题帖仍走正文提炼兜底） */}
            <input
              className="w-full border-0 border-b border-line bg-transparent px-[2px] pb-[10px] pt-[4px] text-[18px] font-semibold leading-[1.5] text-foreground outline-none transition-[border-color] duration-[180ms] placeholder:text-[14px] placeholder:font-normal placeholder:text-soft focus:border-line-primary [font:inherit]"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="请输入标题"
              maxLength={60}
              aria-label="标题"
            />
            {/* 轻量富文本正文（compact：工具栏常显 B/斜体/无序列表/图片；链接靠正文输入/粘贴自动识别；图片多选进图集条，第 1 张自动作封面） */}
            <RichEditor compact value={html} onChange={setHtml} upload={uid ? { userId: uid, postId: draftId } : undefined} onUploadedChange={onGalleryChange} />

            {/* 内容分类（固定枚举，默认「其他」可改；分类是内容属性，与 #标签 分离） */}
            <div className="grid gap-[6px]">
              <span className="text-[12px] font-semibold text-muted">分类</span>
              <div className="flex flex-wrap gap-2">
                {SQUARE_CATEGORIES.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className={`cursor-pointer rounded-full border border-line bg-surface px-[13px] py-[6px] text-[12px] text-muted transition-[border-color,color,background-color] duration-[180ms] hover:border-line-primary hover:text-primary${category === name ? " border-primary bg-primary-soft font-semibold text-primary" : ""}`}
                    onClick={() => setCategory(name)}
                  >{name}</button>
                ))}
              </div>
            </div>

            {submitError && <p className="-mt-[6px] mb-[10px] text-[12px] text-error" role="alert">{submitError}</p>}
            <button className="h-[46px] cursor-pointer rounded-full border-0 bg-primary text-[15px] font-semibold text-on-primary transition-[background-color] duration-[180ms] hover:bg-primary-dark disabled:cursor-default disabled:opacity-60" type="submit" disabled={submitting}>
              {submitting ? "发布中…" : "发布"}
            </button>
          </form>

        {/* 放弃确认（2026-09-02）：dirty 时覆盖在表单之上——返回「继续编辑」组件不卸载、输入不丢失
            覆盖层圆角与面板同源 rounded-card（= --radius-card 18px，替代原 border-radius: inherit） */}
        {confirmClose && (
          <div className="absolute inset-0 z-20 grid place-items-center rounded-card bg-surface p-6" role="alertdialog" aria-label="放弃未发布的内容">
            <div className="max-w-[300px] text-center">
              <h3 className="m-0 mb-2 text-[16px] font-semibold">放弃未发布的内容？</h3>
              <p className="m-0 mb-5 text-[13px] leading-[1.7] text-muted">标题、正文与已上传的图片将不会被保存，离开后无法恢复。</p>
              <div className="flex justify-center gap-[10px]">
                <button type="button" className="cursor-pointer rounded-full border-0 bg-primary px-5 py-[9px] text-[13px] font-semibold text-on-primary transition-[background-color] duration-[180ms] hover:bg-primary-dark [font:inherit]" autoFocus onClick={() => setConfirmClose(false)}>继续编辑</button>
                {/* close-confirm-discard 宿主类保留：hover 实心红 + #fff 白字收容于 decor.css（非令牌色） */}
                <button
                  type="button"
                  className="close-confirm-discard cursor-pointer rounded-full border border-error bg-transparent px-[18px] py-2 text-[13px] font-semibold text-error transition-[background-color,color] duration-[180ms] [font:inherit]"
                  onClick={() => {
                    setConfirmClose(false);
                    doClose();
                  }}
                >放弃并关闭</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
