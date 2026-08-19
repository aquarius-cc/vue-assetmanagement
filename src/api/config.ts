/**
 * @file API 全局常量（DR-4 唯一来源，request/tokenRefresh 共用）
 * @module api/config
 * @exports
 *   - BASE_URL: API 基础路径
 *   - TIMEOUT: 请求超时
 *   - MAX_REFRESH_RETRY_COUNT: 401 刷新最大重试次数
 *   - REFRESH_TIMEOUT / REFRESH_NETWORK_RETRY / REFRESH_RETRY_DELAY: 刷新参数
 */

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const TIMEOUT = 15_000

export const MAX_REFRESH_RETRY_COUNT = 2

export const REFRESH_TIMEOUT = 15_000

export const REFRESH_NETWORK_RETRY = 1

export const REFRESH_RETRY_DELAY = 300
