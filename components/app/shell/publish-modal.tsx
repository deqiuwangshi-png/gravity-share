/**
 * 发布弹窗（client，2026-08-27 三入口合并改版；2026-08-29 正文升级轻量富文本；2026-08-31 移除可选标注）
 * 统一发布到广场内容池（square_posts）——首页工作台的探索区暂从这里读取内容
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
import { SQUARE_CATEGORIES } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { SQUARE_UPDATED_EVENT } from "@/lib/events";
import { stripHtml } from "@/lib/text";
import { createSquarePost } from "@/lib/square-actions";
import { RichEditor } from "@/components/app/common/rich-editor";
import { removeImage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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

  /* Esc / 点遮罩 = 明确取消意图，同样过 dirty 守卫（2026-09-03 P1：原手写 document keydown
   * effect 删除——Radix Dialog 内置 Esc → onOpenChange(false) → attemptClose，见下方 Dialog 绑定） */

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
      /* 组装 / sanitize / insert / 失败孤儿图回滚 收口于 lib/square-actions.createSquarePost
       * （封面 = 图集第 1 张；tags 提炼 / url 恒 null / post_type 语义随迁，双侧不再漂移） */
      const { ok } = await createSquarePost(supabase, {
        id,
        authorId: user.id,
        html,
        title,
        category,
        galleryPaths,
      });
      if (!ok) {
        setSubmitError("发布失败，请重试");
        return;
      }
      submittedRef.current = true;
      /* D（2026-09-02 规模化分析）：事件携带新帖 id —— 列表监听方「拉单条插头 + 裁尾」增量刷新，
       * 替代旧的全量重拉 100 替换（消除重复请求与滚动跳变） */
      window.dispatchEvent(new CustomEvent(SQUARE_UPDATED_EVENT, {
        detail: { type: "created", postId: id, authorId: user.id, category },
      }));
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
    /* Dialog 壳（2026-09-03 P1 重构）：自研遮罩 + onMouseDown 自检 + 手写 Esc → Radix Dialog 组合
     * Esc / 点遮罩统一走 onOpenChange(false) → attemptClose（dirty 守卫）；点遮罩判定按 pointerdown
     * 是否落在面板外（Radix onPointerDownOutside）——编辑器内按下拖出松手不误关，语义等价原目标自检 */
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) attemptClose();
      }}
    >
      {/* 面板：modal-box 宿主类仅承载 decor 阴影（0 30px 80px rgba(0,0,0,.15)，非令牌收容）；
          固定定位的 DialogContent 即 confirmClose 覆盖层（absolute inset-0）的包含块（原面板 relative） */}
      <DialogContent className="modal-box w-[min(560px,calc(100%-2rem))] min-w-0 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-card bg-surface p-7">
        <div className="mb-[25px] flex items-center justify-between">
          <DialogTitle className="m-0 text-[20px]">发布</DialogTitle>
          <Button variant="ghost" size="icon" aria-label="关闭" onClick={attemptClose} className="rounded-lg bg-hover text-muted"><X size={16} /></Button>
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
            <Button
              type="submit"
              variant="default"
              size="lg"
              className="h-[46px]"
              disabled={submitting}
            >
              {submitting ? "发布中…" : "发布"}
            </Button>
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
                {/* close-confirm-discard 宿主类保留：hover 实心红 + 白字收容于 decor.css ⑦（白字走 --on-error 令牌） */}
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
      </DialogContent>
    </Dialog>
  );
}
