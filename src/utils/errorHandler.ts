/**
 * @file 错误处理工具函数，从 catch 块中提取后端错误消息并展示用户友好提示
 * @module src/utils/errorHandler
 * @exports
 *   - getErrorMessage: 从错误对象提取可读错误消息
 *   - getAxiosStatus: 从错误对象提取 HTTP 状态码
 *   - getAxiosResponseData: 从错误对象提取 Axios 响应数据
 *   - showErrorMessage: 统一错误提示（ElMessage.error）
 * @callers
 *   - views/system/AuthUserManage
 * @dependsOn
 *   - axios (isAxiosError)
 *   - element-plus (ElMessage)
 */

import { isAxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { logError } from '@/utils/logger'

/**
 * 从错误对象中提取可读的错误消息
 * @param err 捕获的错误对象
 * @param fallback 兜底错误消息
 * @returns 可读的错误消息字符串
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    return err.response?.data?.message || fallback
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return fallback
}

/**
 * 从错误对象中提取 HTTP 状态码
 * @param err 捕获的错误对象
 * @returns HTTP 状态码，非 Axios 错误返回 0
 */
export function getAxiosStatus(err: unknown): number {
  if (isAxiosError(err)) {
    return err.response?.status ?? 0
  }
  return 0
}

/**
 * 从错误对象中提取 Axios 响应数据
 * @param err 捕获的错误对象
 * @returns 响应数据对象，非 Axios 错误返回 null
 */
export function getAxiosResponseData(err: unknown): Record<string, unknown> | null {
  if (isAxiosError(err)) {
    return (err.response?.data as Record<string, unknown>) ?? null
  }
  return null
}

/**
 * 统一的错误提示函数
 * 从 catch 块中提取后端错误消息并以 ElMessage.error 展示
 * @param err 捕获的错误对象
 * @param fallback 兜底错误消息
 */
export function showErrorMessage(err: unknown, fallback: string): void {
  logError('utils/errorHandler', fallback, err)
  ElMessage.error(getErrorMessage(err, fallback))
}

/**
 * [M-RC-09] 调用方错误提示单出口（双轨契约的唯一实现，DR-4）。
 *
 * 判据推导（写死，勿改）：
 * - AxiosError → 响应拦截器（request.ts）对非 401 的 status / 无响应 / 配置错误
 *   三分支均已弹 toast，此处只 logError 补上下文，绝不二次弹窗；
 * - 非 AxiosError（含 unwrapResponse 在 code!==0 时抛出的 `new Error(res.message)`、
 *   本地构造的 Error）→ 拦截器未处理，由本函数弹一次，业务消息优先。
 *
 * @param err 捕获的错误对象
 * @param fallback 非 AxiosError 时的兜底文案
 */
export function notifyCallerError(err: unknown, fallback: string): void {
  if (isAxiosError(err)) {
    logError('utils/errorHandler', `${fallback}（AxiosError 已由拦截器提示）`, err)
    return
  }
  ElMessage.error(getErrorMessage(err, fallback))
}
