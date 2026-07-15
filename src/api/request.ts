// api/request.ts
// Axios 实例封装、拦截器、通用请求方法
// 遵守 AGENTS 红线：类型严格，无 any，隐晦逻辑必注释

import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { isAxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { MemoryCache } from '@/api/cache'
import {
  setEncryptedToken,
  getDecryptedToken,
  clearAllAuthTokens
} from '@/utils/tokenCrypto'

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

// 从环境变量获取基础 URL，默认值为 http://127.0.0.1:8000/api/v1
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'
const TIMEOUT = 15_000

// Token 刷新最大重试次数
const MAX_REFRESH_RETRY_COUNT = 2

const cache = new MemoryCache()

// 401 错误提示去重：防止多个并发请求同时触发 "登录已过期" 提示
let loginExpiredMessageShown = false
const LOGIN_EXPIRED_MESSAGE_DURATION = 3000 // 3秒内不重复显示

// ======================== Axios 实例 ========================

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
})

// ---------- 请求拦截器 ----------
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从加密存储获取 Token
    const token = getDecryptedToken('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    config.headers['X-Requested-With'] = 'XMLHttpRequest'
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

    const originalRequest = error.config
    const status = error.response?.status

    // 401 自动刷新 token（带重试机制）
    if (status === 401 && originalRequest && !originalRequest._retry) {
      // 初始化重试计数
      originalRequest._retryCount = originalRequest._retryCount || 0

      // 检查是否超过最大重试次数
      if (originalRequest._retryCount >= MAX_REFRESH_RETRY_COUNT) {
        console.error('Token 刷新重试次数超过上限')
        clearAllAuthTokens()
        // 去重：防止与下方统一错误提示重复显示
        if (!loginExpiredMessageShown) {
          loginExpiredMessageShown = true
          ElMessage.error('登录已过期，请重新登录')
          setTimeout(() => { loginExpiredMessageShown = false }, LOGIN_EXPIRED_MESSAGE_DURATION)
        }
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // 标记为已重试（防止无限循环）
      originalRequest._retry = true
      originalRequest._retryCount++

      try {
        const refreshToken = getDecryptedToken('refresh_token')
        if (!refreshToken) {
          throw new Error('无 refresh_token')
        }

        // 独立 axios 实例避免拦截器循环
        const refreshResponse = await axios.post<{ access: string }>(
          `${BASE_URL}/auth/token/refresh/`,
          { refresh: refreshToken },
        )

        const newAccessToken = refreshResponse.data.access
        // 加密存储新的 Token
        setEncryptedToken('access_token', newAccessToken)

        // 重置重试标记，更新请求头，重新发送原始请求
        originalRequest._retry = false
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError: unknown) {
        console.error('Token 刷新失败:', refreshError)
        clearAllAuthTokens()
        // 与 retry 超限路径保持一致：显示去重的登录过期提示
        if (!loginExpiredMessageShown) {
          loginExpiredMessageShown = true
          ElMessage.error('登录已过期，请重新登录')
          setTimeout(() => { loginExpiredMessageShown = false }, LOGIN_EXPIRED_MESSAGE_DURATION)
        }
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // ---------- 统一错误提示 ----------
    if (error.response) {
      const { status: code, data } = error.response
      // 优先提取错误信息：detail > message > error
      // DRF 返回格式：{ detail: "..." } 或 { message: "..." }
      const msg = (data as Record<string, unknown>)?.detail
        || (data as Record<string, unknown>)?.message
        || (data as Record<string, unknown>)?.error
        || '请求失败'

      switch (code) {
        case 401:
          // 去重：防止多个并发 401 请求重复显示 "登录已过期" 提示
          if (!loginExpiredMessageShown) {
            loginExpiredMessageShown = true
            ElMessage.error('登录已过期，请重新登录')
            setTimeout(() => { loginExpiredMessageShown = false }, LOGIN_EXPIRED_MESSAGE_DURATION)
          }
          break
        case 403:
          ElMessage.error('没有权限访问该资源')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error(`服务器内部错误: ${msg}`)
          break
        default:
          ElMessage.error(msg as string)
      }
    } else if (error.request) {
      ElMessage.error('请求无响应，请检查网络连接')
    } else {
      ElMessage.error(`请求配置错误: ${error.message}`)
    }

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
    ? Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null),
      )
    : undefined
  const paramsStr = paramsObj ? new URLSearchParams(paramsObj as Record<string, string>).toString() : ''
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

export async function post<T>(
  url: string,
  data?: unknown,
): Promise<ApiResponse<T>> {
  const response = await api.post<ApiResponse<T>>(url, data)
  // 注意：缓存清除已由响应拦截器处理（按URL模式清除）
  // 此处不再调用 cache.clear()，避免清除不相关的缓存条目
  return response.data
}

export async function put<T>(
  url: string,
  data?: unknown,
): Promise<ApiResponse<T>> {
  const response = await api.put<ApiResponse<T>>(url, data)
  // 注意：缓存清除已由响应拦截器处理
  return response.data
}

export async function patch<T>(
  url: string,
  data?: unknown,
): Promise<ApiResponse<T>> {
  const response = await api.patch<ApiResponse<T>>(url, data)
  // 注意：缓存清除已由响应拦截器处理
  return response.data
}

export async function del<T>(
  url: string,
): Promise<ApiResponse<T>> {
  const response = await api.delete<ApiResponse<T>>(url)
  // 注意：缓存清除已由响应拦截器处理
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
