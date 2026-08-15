/**
 * @file Token 刷新核心（双通道 + 单飞 + 跨标签页同步）
 * @module utils/tokenRefresh
 * @exports
 *   - RefreshSessionError: 刷新失败（会话无效）
 *   - MissingRefreshTokenError: 缺少 refresh token（bearer 通道）
 *   - refreshAccessToken: 刷新 access token（按通道分流）
 * @description
 *   - bearer 通道: body 提交 refresh，轮换响应需持久化新 refresh（修复旧 Bug）
 *   - cookie 通道: 空 body + X-CSRFToken 头，后端从 HttpOnly refresh Cookie 读取，
 *     access 写入内存（JS 无法读 HttpOnly Cookie）
 *   - 单飞: 并发 401 共享同一个刷新 Promise，避免重复刷新触发轮换竞态
 *   - 跨标签页: BroadcastChannel 广播新 token，其他标签页同步更新
 */
import axios from 'axios'
import { BASE_URL, REFRESH_NETWORK_RETRY, REFRESH_RETRY_DELAY, REFRESH_TIMEOUT } from '@/api/config'
import { setEncryptedToken, getDecryptedToken } from '@/utils/tokenCrypto'
import { getCsrfToken } from '@/utils/csrf'
import { setInMemoryAccessToken } from '@/utils/tokenMemory'
import { generateTraceId } from '@/utils/traceId'
import { isTransientError } from '@/utils/requestErrors'
import type { AuthChannel } from '@/utils/device'

export class RefreshSessionError extends Error {}

export class MissingRefreshTokenError extends RefreshSessionError {}

interface RefreshResponse {
  code: number
  message: string
  data: { access: string; refresh?: string }
}

const AUTH_BROADCAST_CHANNEL = 'asset_auth_tokens'

let refreshPromise: Promise<string> | null = null
let broadcastChannel: BroadcastChannel | null = null

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (broadcastChannel) return broadcastChannel
  broadcastChannel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL)
  broadcastChannel.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data
    if (!msg || msg.type !== 'access') return
    if (typeof msg.access !== 'string' || !msg.access) return
    setInMemoryAccessToken(msg.access)
    if (msg.channel === 'bearer') {
      setEncryptedToken('access_token', msg.access)
      if (typeof msg.refresh === 'string' && msg.refresh) {
        setEncryptedToken('refresh_token', msg.refresh)
      }
    }
  })
  return broadcastChannel
}

function broadcastNewToken(channel: AuthChannel, access: string): void {
  const refresh = channel === 'bearer' ? getDecryptedToken('refresh_token') : undefined
  getBroadcastChannel()?.postMessage({ type: 'access', channel, access, refresh })
}

function parseRefreshResponse(data: RefreshResponse): string {
  if (data.code !== 0) {
    throw new RefreshSessionError(data.message || 'Token 刷新失败')
  }
  const access = data.data?.access
  if (!access) throw new RefreshSessionError('刷新响应缺少 access token')
  return access
}

async function refreshBearer(): Promise<string> {
  const refreshToken = getDecryptedToken('refresh_token')
  if (!refreshToken) throw new MissingRefreshTokenError('无 refresh_token')
  let attempt = 0
  for (;;) {
    try {
      const response = await axios.post<RefreshResponse>(
        `${BASE_URL}/auth/token/refresh/`,
        { refresh: refreshToken },
        {
          headers: { 'X-Request-ID': generateTraceId(), 'X-Requested-With': 'XMLHttpRequest' },
          timeout: REFRESH_TIMEOUT,
        },
      )
      const access = parseRefreshResponse(response.data)
      // 轮换修复：ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION 下，
      // 旧 refresh 已作废，必须持久化新 refresh，否则下次刷新直接 400 强退
      if (response.data.data?.refresh) {
        setEncryptedToken('refresh_token', response.data.data.refresh)
      }
      setEncryptedToken('access_token', access)
      return access
    } catch (error) {
      if (isTransientError(error) && attempt < REFRESH_NETWORK_RETRY) {
        await new Promise((resolve) => setTimeout(resolve, REFRESH_RETRY_DELAY))
        attempt++
        continue
      }
      throw error
    }
  }
}

async function refreshCookie(): Promise<string> {
  let attempt = 0
  for (;;) {
    try {
      const headers: Record<string, string> = {
        'X-Request-ID': generateTraceId(),
        'X-Requested-With': 'XMLHttpRequest',
      }
      const csrfToken = getCsrfToken()
      if (csrfToken) headers['X-CSRFToken'] = csrfToken
      const response = await axios.post<RefreshResponse>(
        `${BASE_URL}/auth/token/refresh/`,
        undefined,
        { headers, timeout: REFRESH_TIMEOUT, withCredentials: true },
      )
      const access = parseRefreshResponse(response.data)
      setInMemoryAccessToken(access)
      return access
    } catch (error) {
      if (isTransientError(error) && attempt < REFRESH_NETWORK_RETRY) {
        await new Promise((resolve) => setTimeout(resolve, REFRESH_RETRY_DELAY))
        attempt++
        continue
      }
      throw error
    }
  }
}

/**
 * 刷新 access token（通道感知，并发单飞）
 * @param channel 认证通道
 * @returns 新的 access token
 * @throws RefreshSessionError / MissingRefreshTokenError / AxiosError(瞬时)
 */
export async function refreshAccessToken(channel: AuthChannel): Promise<string> {
  refreshPromise ??= performRefresh(channel)
  return refreshPromise
}

async function performRefresh(channel: AuthChannel): Promise<string> {
  try {
    const access = channel === 'bearer' ? await refreshBearer() : await refreshCookie()
    broadcastNewToken(channel, access)
    return access
  } finally {
    refreshPromise = null
  }
}
