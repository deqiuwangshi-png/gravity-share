/**
 * 兼容转发（2026-09-03 P0）：LoadError 已收编为 components/ui/error-state 的 ErrorState。
 * 保留本文件原名导出，调用方（square-feed / notification-drawer）import 零扰动；
 * 后续新代码请直接 `import { ErrorState } from "@/components/ui/error-state"`
 */
export { ErrorState as LoadError } from "@/components/ui/error-state";
