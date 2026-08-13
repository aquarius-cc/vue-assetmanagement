/**
 * @file 错误处理工具函数，从 catch 块中提取后端错误消息并展示用户友好提示
 * @module src/utils/errorHandler
 * @exports
 *   - getErrorMessage: 从错误对象提取可读错误消息
 *   - getAxiosStatus: 从错误对象提取 HTTP 状态码
 *   - getAxiosResponseData: 从错误对象提取 Axios 响应数据
 *   - showErrorMessage: 统一错误提示（ElMessage.error）
 * @callers
 *   - composables/useOutAssetForm
 *   - composables/useDepartmentEmployeeList
 *   - views/system/AuthUserManage
 * @dependsOn
 *   - axios (isAxiosError)
 *   - element-plus (ElMessage)
 */

import { isAxiosError } from 'axios'
import { ElMessage } from 'element-plus'

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
  console.error(fallback, err)
  ElMessage.error(getErrorMessage(err, fallback))
}
