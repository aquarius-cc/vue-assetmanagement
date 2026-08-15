/**
 * @file Axios 实例封装、请求/响应拦截器、通用请求方法（双认证通道）
 * @module api/request
 * @exports
 *   - default: Axios 实例（包含拦截器配置）
 *   - get: GET 请求方法
 *   - post: POST 请求方法
 *   - put: PUT 请求方法
 *   - patch: PATCH 请求方法
 *   - del: DELETE 请求方法
 *   - unwrapResponse: 响应解包函数
 *   - ApiResponse: 统一响应类型定义
 * @description
 *   双认证通道（与后端 authentication.py 契约一致，DR-1）：
 *   - bearer 通道（移动端）：Authorization: Bearer 头
 *   - cookie 通道（PC）：不带 Authorization，非安全方法附加 X-CSRFToken
 *   401 刷新与轮换竞态宽容重试逻辑收敛至 utils/tokenRefresh（DR-4）。
 * @callers
 *   - api/index.ts: 统一导出入口
 *   - 全部 src/api/*.ts 业务模块
 * @dependsOn
 *   - api/cache.ts: MemoryCache
 *   - api/config.ts: 全局常量
 *   - utils/tokenCrypto / tokenRefresh / device / csrf / requestErrors
 */

import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { isAxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { MemoryCache } from '@/api/cache'
import { getDecryptedToken, clearAllAuthTokens } from '@/utils/tokenCrypto'
import { generateTraceId } from '@/utils/traceId'
import { BASE_URL, TIMEOUT, MAX_REFRESH_RETRY_COUNT } from '@/api/config'
import { detectAuthChannel } from '@/utils/device'
import { refreshAccessToken, MissingRefreshTokenError } from '@/utils/tokenRefresh'
import { isTransientError } from '@/utils/requestErrors'
import { getCsrfToken } from '@/utils/csrf'

// ---------- 扩展 Axios 类型，添加自定义属性 _retry ----------
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** 标记是否已尝试刷新 token，防止无限循环 */
    _retry?: boolean
    /** 标记 token 刷新重试次数 */
    _retryCount?: number
  }
}

// ======================== 类型定义 ========================

/** 后端统一响应格式（AGENTS.md §3 跨端契约：code=0 成功，message 字段名） */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** 请求选项（预留扩展） */
interface RequestOptions {
  /** 是否启用缓存（仅 GET 有效） */
  useCache?: boolean
  /** 缓存有效期（毫秒），默认 5 分钟 */
  cacheTTL?: number
}

// ======================== 常量 ========================

const cache = new MemoryCache()

let loginExpiredMessageShown = false
const LOGIN_EXPIRED_MESSAGE_DURATION = 3000
const transientMessageShown = new Set<string>()

// ======================== 提示/跳转 helper ========================

function showLoginExpired(): void {
  if (loginExpiredMessageShown) return
  loginExpiredMessageShown = true
  ElMessage.error('登录已过期，请重新登录')
  setTimeout(() => {
    loginExpiredMessageShown = false
  }, LOGIN_EXPIRED_MESSAGE_DURATION)
}

function showErrorDedup(message: string): void {
  if (transientMessageShown.has(message)) return
  transientMessageShown.add(message)
  ElMessage.error(message)
  setTimeout(() => transientMessageShown.delete(message), LOGIN_EXPIRED_MESSAGE_DURATION)
}

function redirectToLogin(): void {
  window.location.href = '/login'
}

function isSafeMethod(method: string | undefined): boolean {
  const m = (method || 'get').toLowerCase()
  return m === 'get' || m === 'head' || m === 'options'
}

// ======================== 401 刷新处理 ========================

/**
 * 处理刷新失败（轮换竞态宽容重试 / 瞬时保留 / 会话失效登出）
 * @returns 需重放的响应；undefined 表示无需重放（调用方 reject）
 */
async function handleRefreshFailure(
  refreshError: unknown,
  originalRequest: InternalAxiosRequestConfig,
): Promise<unknown> {
  const detail = refreshError instanceof Error ? refreshError.message : String(refreshError)
  if (isTransientError(refreshError)) {
    console.error(`Token 刷新瞬时失败（保留会话）: ${detail}`)
    showErrorDedup('网络异常，请稍后重试')
    return undefined
  }
  // 轮换竞态宽容重试：refresh 失败可能是其他请求/标签页已轮换成功，
  // 用当前 token/Cookie 重放原请求一次（若会话真失效，重放仍 401 再登出）
  const isRotationRace =
    !(refreshError instanceof MissingRefreshTokenError) &&
    (originalRequest._retryCount || 0) <= MAX_REFRESH_RETRY_COUNT
  if (isRotationRace) {
    console.warn(`Token 刷新失败（轮换竞态，重放原请求）: ${detail}`)
    originalRequest._retry = false
    return api(originalRequest)
  }
  console.error(`Token 刷新失败（会话失效）: ${detail}`)
  clearAllAuthTokens()
  showLoginExpired()
  redirectToLogin()
  return undefined
}

/**
 * 处理 401：登录端点直接放行；其余走刷新流程（单飞 + 重放）
 */
async function handleUnauthorized(error: unknown): Promise<unknown> {
  if (!isAxiosError(error)) return Promise.reject(error)
  const originalRequest = error.config
  if (!originalRequest) return Promise.reject(error)

  // 认证端点（登录）的 401 表示凭据错误，非 Token 过期
  const requestUrl = originalRequest.url || ''
  if (requestUrl.includes('/auth/login/')) {
    return Promise.reject(error)
  }

  originalRequest._retryCount = originalRequest._retryCount || 0
  if (originalRequest._retryCount >= MAX_REFRESH_RETRY_COUNT) {
    console.error('Token 刷新重试次数超过上限')
    clearAllAuthTokens()
    showLoginExpired()
    redirectToLogin()
    return Promise.reject(error)
  }

  originalRequest._retry = true
  originalRequest._retryCount++
  const channel = detectAuthChannel()

  try {
    // 单飞刷新在 utils/tokenRefresh 内部保证（并发 401 共享同一 Promise）
    const newAccessToken = await refreshAccessToken(channel)
    if (channel === 'bearer') {
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
    }
    originalRequest._retry = false
    return api(originalRequest)
  } catch (refreshError: unknown) {
    const replay = await handleRefreshFailure(refreshError, originalRequest)
    if (replay !== undefined) return replay
    return Promise.reject(refreshError)
  }
}

// ======================== 统一错误提示 ========================

function pickErrorMessage(data: unknown): string {
  const obj = data as Record<string, unknown> | null
  const msg = obj?.detail ?? obj?.message ?? obj?.error
  return typeof msg === 'string' ? msg : '请求失败'
}

function showStatusMessage(status: number, msg: string): void {
  switch (status) {
    case 401:
      showLoginExpired()
      break
    case 403:
      ElMessage.error('没有权限访问该资源')
      break
    case 404:
      ElMessage.error('请求的资源不存在或您无权访问')
      break
    case 500:
      ElMessage.error(`服务器内部错误: ${msg}`)
      break
    default:
      ElMessage.error(msg)
  }
}

function notifyApiError(
  status: number | undefined,
  data: unknown,
  error: { request?: unknown; message: string },
): void {
  if (status) {
    showStatusMessage(status, pickErrorMessage(data))
    return
  }
  if (error.request) {
    ElMessage.error('请求无响应，请检查网络连接')
    return
  }
  ElMessage.error(`请求配置错误: ${error.message}`)
}

// ======================== Axios 实例 ========================

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
  // cookie 通道需要携带 Cookie（跨域场景 withCredentials 必填；同源无害）
  withCredentials: true,
})

// ---------- 请求拦截器 ----------
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const channel = detectAuthChannel()
    config.headers['X-Requested-With'] = 'XMLHttpRequest'
    if (!config.headers['X-Request-ID']) {
      config.headers['X-Request-ID'] = generateTraceId()
    }

    if (channel === 'bearer') {
      const token = getDecryptedToken('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } else if (!isSafeMethod(config.method)) {
      // cookie 通道非安全方法必须携带 CSRF Token（后端强制校验）
      const csrfToken = getCsrfToken()
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken
      }
    }
    return config
  },
  (error: unknown) => {
    console.error('请求配置错误:', error)
    return Promise.reject(error)
  },
)

// ---------- 响应拦截器 ----------
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // 写操作后清除相关缓存，防止数据过期
    const config = response.config
    const method = config.method?.toLowerCase()
    if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
      const url = config.url || ''
      cache.clearByPattern(url.split('?')[0])
      cache.clearExpired()
    }
    return response
  },

  async (error: unknown) => {
    // 防御：非 Axios 错误直接抛出
    if (!isAxiosError(error)) {
      console.error('非 Axios 错误:', error)
      return Promise.reject(error)
    }

    const status = error.response?.status

    if (status === 401) {
      return handleUnauthorized(error)
    }

    notifyApiError(status, error.response?.data, error)
    return Promise.reject(error)
  },
)

// ======================== 通用请求方法 ========================

// ---------- 重载签名（支持新/旧两种调用方式） ----------

/** 新方式：使用 options 对象 */
export async function get<T>(
  url: string,
  params?: Record<string, string | number | boolean | null | undefined>,
  options?: RequestOptions,
): Promise<ApiResponse<T>>

/** 旧方式兼容：直接传递 useCache 和 cacheTTL 参数 */
export async function get<T>(
  url: string,
  params?: Record<string, string | number | boolean | null | undefined>,
  useCache?: boolean,
  cacheTTL?: number,
): Promise<ApiResponse<T>>

/**
 * 实现：统一将参数转换为 options 对象
 */
export async function get<T>(
  url: string,
  params?: Record<string, string | number | boolean | null | undefined>,
  optionsOrUseCache?: RequestOptions | boolean,
  cacheTTL?: number,
): Promise<ApiResponse<T>> {
  // 标准化 options
  let options: RequestOptions | undefined
  if (typeof optionsOrUseCache === 'boolean') {
    // 旧版调用：get(url, params, true, 300000)
    options = { useCache: optionsOrUseCache, cacheTTL: cacheTTL ?? 300_000 }
  } else {
    // 新版调用：get(url, params, { useCache: true, cacheTTL: 300000 })
    options = optionsOrUseCache
  }

  // 构建查询参数
  const paramsObj = params
    ? Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    : undefined
  const paramsStr = paramsObj
    ? new URLSearchParams(paramsObj as Record<string, string>).toString()
    : ''
  const cacheKey = `${url}?${paramsStr}`

  // 启用缓存时优先返回缓存数据
  if (options?.useCache) {
    const cached = cache.get(cacheKey)
    if (cached !== undefined) {
      return cached as ApiResponse<T>
    }
  }

  try {
    const response = await api.get<ApiResponse<T>>(url, { params: paramsObj })
    const data = response.data

    if (options?.useCache) {
      cache.set(cacheKey, data, options.cacheTTL ?? 300_000)
    }
    return data
  } catch (error: unknown) {
    // 降级：请求失败但有缓存时返回旧数据
    if (options?.useCache) {
      const cached = cache.get(cacheKey)
      if (cached !== undefined) {
        console.warn(`[降级] 请求失败，返回缓存数据: ${url}`)
        return cached as ApiResponse<T>
      }
    }
    throw error
  }
}

export async function post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  const response = await api.post<ApiResponse<T>>(url, data)
  // 注意：缓存清除已由响应拦截器处理（按URL模式清除）
  return response.data
}

export async function put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  const response = await api.put<ApiResponse<T>>(url, data)
  return response.data
}

export async function patch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
  const response = await api.patch<ApiResponse<T>>(url, data)
  return response.data
}

export async function del<T>(url: string): Promise<ApiResponse<T>> {
  const response = await api.delete<ApiResponse<T>>(url)
  return response.data
}

// ======================== 解包工具 ========================

/**
 * 解包响应数据
 * 验证响应的 code 字段，0 视为成功（AGENTS.md §3 跨端契约）
 * @param promise - API 请求 Promise
 * @returns 响应的 data 部分
 * @throws 当 code !== 0 时抛出错误
 */
export async function unwrapResponse<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
  const res = await promise
  if (res.code !== 0) {
    throw new Error(res.message || '请求失败')
  }
  return res.data
}

export default api
