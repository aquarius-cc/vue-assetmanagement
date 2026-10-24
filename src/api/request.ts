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
 *   - getBlob: 二进制下载通道（服务端导出）
 *   - unwrapResponse: 响应解包函数
 *   - ApiResponse: 统一响应类型定义
 *   - BlobDownload / ExportResponseHeaders: 导出下载结果类型
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
 *   - utils/tokenObfuscator / tokenRefresh / device / csrf / requestErrors
 *   - utils/fileDownload: resolveDownloadFilename（Content-Disposition 解析）
 */

import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { isAxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { MemoryCache } from '@/api/cache'
import { decodeToken, clearAllAuthTokens } from '@/utils/tokenObfuscator'
import { generateTraceId } from '@/utils/traceId'
import { BASE_URL, TIMEOUT, MAX_REFRESH_RETRY_COUNT, EXPORT_TIMEOUT } from '@/api/config'
import { detectAuthChannel } from '@/utils/device'
import { refreshAccessToken, MissingRefreshTokenError } from '@/utils/tokenRefresh'
import { isTransientError } from '@/utils/requestErrors'
import { getCsrfToken } from '@/utils/csrf'
import { logError, logWarn } from '@/utils/logger'
import { resolveDownloadFilename } from '@/utils/fileDownload'

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
  /**
   * [M-12] 降级标记：GET 失败但命中本地缓存时返回旧数据，此字段置 true。
   * 消费方可据此提示「当前展示为缓存数据」，避免用户无限期看旧数据。
   */
  _degraded?: boolean
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

/**
 * [M-29] 构造带回跳参数的登录页 URL（纯函数，可测）。
 * LogIn.vue 已消费 route.query.redirect（限定以 / 开头且非 //，防开放重定向），
 * 会话失效重登后回跳原页面；登录页自身与根路径无回跳价值，保持裸 /login。
 * pathname 缺失/非站内绝对路径（如测试桩 location 仅含 href）按无回跳目标处理。
 */
export function buildLoginRedirectUrl(back?: { pathname?: string; search?: string }): string {
  const pathname = back?.pathname
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')) {
    return '/login'
  }
  if (pathname.startsWith('/login')) return '/login'
  const search = typeof back?.search === 'string' ? back.search : ''
  const backUrl = `${pathname}${search}`
  if (backUrl === '/') return '/login'
  return `/login?redirect=${encodeURIComponent(backUrl)}`
}

function redirectToLogin(): void {
  // [M-29] 登出跳转携带 redirect 回跳参数（原实现固定 /login，重登后丢失原页面）
  window.location.href = buildLoginRedirectUrl(window.location)
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
    logError('api/request', `Token 刷新瞬时失败（保留会话）: ${detail}`)
    showErrorDedup('网络异常，请稍后重试')
    return undefined
  }
  // 轮换竞态宽容重试：refresh 失败可能是其他请求/标签页已轮换成功，
  // 用当前 token/Cookie 重放原请求一次（若会话真失效，重放仍 401 再登出）
  const isRotationRace =
    !(refreshError instanceof MissingRefreshTokenError) &&
    (originalRequest._retryCount || 0) <= MAX_REFRESH_RETRY_COUNT
  if (isRotationRace) {
    logWarn('api/request', `Token 刷新失败（轮换竞态，重放原请求）: ${detail}`)
    originalRequest._retry = false
    return api(originalRequest)
  }
  logError('api/request', `Token 刷新失败（会话失效）: ${detail}`)
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
    logError('api/request', 'Token 刷新重试次数超过上限')
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

// [P1-4] 下列 3 个内部助手为 pickErrorMessage 原逻辑原样下沉，未改任何判断/返回。

/** 从错误响应体提取顶层 msg 字段（detail/message/error 链） */
const extractTopLevelMsg = (obj: Record<string, unknown> | null): unknown =>
  obj?.detail ?? obj?.message ?? obj?.error

/** 字段级错误格式化：data 键下 `{field: msgs}` → `field: text | field2: text2` */
const formatFieldErrors = (fieldErrors: unknown): string | null => {
  if (!fieldErrors || typeof fieldErrors !== 'object' || Array.isArray(fieldErrors)) return null
  const entries = Object.entries(fieldErrors as Record<string, unknown>)
  if (entries.length === 0) return null
  return entries
    .map(([field, msgs]) => {
      const text = Array.isArray(msgs) ? msgs[0] : String(msgs)
      return `${field}: ${text}`
    })
    .join(' | ')
}

function pickErrorMessage(data: unknown): string {
  const obj = data as Record<string, unknown> | null
  const msg = extractTopLevelMsg(obj)
  if (typeof msg === 'string' && msg !== '参数验证失败') return msg

  const fieldErrors = formatFieldErrors(obj?.data)
  if (fieldErrors !== null) return fieldErrors

  return typeof msg === 'string' ? msg : '请求失败'
}

// [P1-4] 下列 2 个内部助手为 get 原逻辑原样下沉，未改任何判断/返回。

/** 标准化 options：兼容旧版布尔参数与新版对象参数 */
function normalizeGetOptions(
  optionsOrUseCache?: RequestOptions | boolean,
  cacheTTL?: number,
): RequestOptions | undefined {
  if (typeof optionsOrUseCache === 'boolean') {
    return { useCache: optionsOrUseCache, cacheTTL: cacheTTL ?? 300_000 }
  }
  return optionsOrUseCache
}

function showStatusMessage(status: number, msg: string): void {
  // 401 不会进入此函数：错误拦截器(L300)已提前拦截 401 走刷新/登出流程
  switch (status) {
    case 403: {
      // 【BF-002 建议2】CSRF 校验失败(后端 PermissionDenied("CSRF Failed: ...") → 403 detail 含 "CSRF")
      // 与权限拒绝区分: 前者引导刷新页面重取 csrftoken, 后者仍按权限提示, 避免配错被误判为无权限
      const isCsrfFailure = String(msg).toLowerCase().includes('csrf')
      ElMessage.error(isCsrfFailure ? '页面会话校验失败，请刷新页面后重试' : '没有权限访问该资源')
      break
    }
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

/**
 * 导出请求（responseType=blob）失败时，错误响应体**也是 Blob**。
 *
 * 直接把 Blob 丢给 pickErrorMessage 会取不到 detail/message，
 * 用户只能看到笼统的「请求失败」——而导出失败原因（超限 400、
 * 无导出权限 403、筛选非法 400）恰恰都在 JSON 体里。故必须读出
 * 文本并解析为 JSON。
 */
async function readBlobErrorData(error: unknown): Promise<unknown> {
  if (!isAxiosError(error)) return undefined
  if (error.config?.responseType !== 'blob') return error.response?.data

  const data: unknown = error.response?.data
  if (!(data instanceof Blob)) return data
  const text = await data.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    // 非 JSON（如网关 HTML 错误页）：pickErrorMessage 取不到结构化字段，
    // 但原始文本要留痕以便排查（OC-2）。
    logWarn('api/request', `导出错误响应非 JSON，原文: ${text.slice(0, 200)}`)
    return undefined
  }
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
      const token = decodeToken('access_token')
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
    logError('api/request', '请求配置错误', error)
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
      logError('api/request', '非 Axios 错误', error)
      return Promise.reject(error)
    }

    const status = error.response?.status

    if (status === 401) {
      return handleUnauthorized(error)
    }

    notifyApiError(status, await readBlobErrorData(error), error)
    return Promise.reject(error)
  },
)

// ======================== 通用请求方法 ========================

/** 请求失败时的缓存降级：有缓存则返回旧数据并告警，否则返回 null（继续抛出） */
function tryFallbackCache<T>(url: string, cacheKey: string): ApiResponse<T> | null {
  const cached = cache.get(cacheKey)
  if (cached === undefined) return null
  logWarn('api/request', `[降级] 请求失败，返回缓存数据: ${url}`)
  // [M-12] 标记降级：消费方（视图/store）可据此提示「当前为缓存数据」
  return { ...(cached as ApiResponse<T>), _degraded: true }
}

/** 构建查询参数对象：过滤 null/undefined 值 */
function buildQueryParams(
  params?: Record<string, string | number | boolean | null | undefined>,
): Record<string, string> | undefined {
  if (!params) return undefined
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<
    string,
    string
  >
}

/** 构建缓存键：`url?querystring` */
function buildCacheKey(url: string, paramsObj?: Record<string, string>): string {
  const paramsStr = paramsObj ? new URLSearchParams(paramsObj).toString() : ''
  return `${url}?${paramsStr}`
}

/** 从缓存读取：命中返回数据，未命中返回 undefined */
function readCache<T>(cacheKey: string): ApiResponse<T> | undefined {
  return cache.get(cacheKey) as ApiResponse<T> | undefined
}

/** 写入缓存：cacheTTL 缺省时使用默认 300_000 */
function writeCache<T>(cacheKey: string, data: ApiResponse<T>, cacheTTL?: number): void {
  cache.set(cacheKey, data, cacheTTL ?? 300_000)
}

/**
 * [M-19] 按 URL 模式清除请求缓存（导出供业务模块在写操作后精确失效关联 GET 缓存）。
 *
 * 背景：拦截器对写操作仅按写 URL 自身清缓存（如 `/assets/assets/X/mark-broken/`
 * 只清含该串的 key），不会命中同实体的 GET 缓存（`/assets/assets/X/`）。
 * mark-broken / batch-delete 等 action 端点改状态后，详情页 5min 缓存不自动失效，
 * 需在写成功后调用本函数显式失效。
 */
export function clearCacheByPattern(pattern: string): void {
  cache.clearByPattern(pattern)
}

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
  const options = normalizeGetOptions(optionsOrUseCache, cacheTTL)
  const useCache = options?.useCache === true

  const paramsObj = buildQueryParams(params)
  const cacheKey = buildCacheKey(url, paramsObj)

  // 启用缓存时优先返回缓存数据
  if (useCache) {
    const cached = readCache<T>(cacheKey)
    if (cached !== undefined) return cached
  }

  try {
    const response = await api.get<ApiResponse<T>>(url, { params: paramsObj })
    const data = response.data

    // [M-29] 仅 code===0 的成功响应入缓存：业务失败体（200 + code!==0）入缓存后，
    // 后续 useCache 调用直接命中错误数据，绕过重试与错误提示
    if (useCache && data.code === 0) writeCache(cacheKey, data, options?.cacheTTL)
    return data
  } catch (error: unknown) {
    // 降级：请求失败但有缓存时返回旧数据
    if (useCache) {
      const fallback = tryFallbackCache<T>(url, cacheKey)
      if (fallback !== null) return fallback
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

// ======================== 二进制（导出）通道 ========================

/** 服务端导出响应头（axios 归一化后的可读头） */
export type ExportResponseHeaders = Record<string, string>

/** Blob 下载结果 */
export interface BlobDownload {
  /** 文件内容 */
  blob: Blob
  /** 归一化响应头：用于读 X-Export-Max-Rows / X-Export-Total-Count / Content-Disposition */
  headers: ExportResponseHeaders
  /** 文件名：优先取服务端 Content-Disposition，取不到则用 fallbackFilename */
  filename: string
}

/**
 * 下载二进制文件（Excel 导出等）。
 *
 * 与 {@link get} 的差异：
 * 1. responseType=blob —— 不走 JSON 解包，拿到原始文件流；
 * 2. 使用 EXPORT_TIMEOUT 而非 TIMEOUT —— 导出是写盘+流式回传，耗时量级不同；
 * 3. 不进 MemoryCache —— 二进制缓存无收益且会占内存；
 * 4. 不返回 ApiResponse —— 成功响应体是文件，不是 {code,data,message}。
 *
 * 失败时错误体也是 Blob，由 {@link readBlobErrorData} 在拦截器中解析回
 * JSON 错误信息并提示，调用方只需 try/catch。
 *
 * @param url 接口路径（相对 BASE_URL）
 * @param params 查询参数（null/undefined 自动剔除）
 * @param fallbackFilename 服务端未暴露 Content-Disposition 时的兜底文件名（建议纯 ASCII）
 */
export async function getBlob(
  url: string,
  params?: Record<string, unknown>,
  fallbackFilename = 'export.xlsx',
): Promise<BlobDownload> {
  const paramsObj = params
    ? Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    : undefined
  const response = await api.get<Blob>(url, {
    params: paramsObj,
    responseType: 'blob',
    timeout: EXPORT_TIMEOUT,
  })
  const headers: ExportResponseHeaders = { ...(response.headers as ExportResponseHeaders) }
  return {
    blob: response.data,
    headers,
    filename: resolveDownloadFilename(headers['content-disposition'], fallbackFilename),
  }
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
