/**
 * @file 请求错误分类工具（DR-4 唯一来源，request/tokenRefresh 共用）
 * @module utils/requestErrors
 * @exports
 *   - isTransientError: 瞬时错误判定（网络/429/5xx）
 */
import { isAxiosError } from 'axios'

/**
 * 瞬时错误（可重试，不销毁会话）：
 *   - 无响应（网络断开/超时）
 *   - HTTP 429（限流）
 *   - HTTP >= 500（服务器错误）
 */
export function isTransientError(error: unknown): boolean {
  return (
    isAxiosError(error) &&
    (!error.response || error.response.status === 429 || error.response.status >= 500)
  )
}
