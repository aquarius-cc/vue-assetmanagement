/**
 * @file WebSocket 通知连接管理（连接建立、心跳保活、断线重连、消息分发）
 * @module composables/useNotificationConnection
 * @exports
 *   - useNotificationConnection: 通知 WebSocket 连接管理 composable
 * @callers
 *   - composables/useNotification: 通知数据管理（聚合连接件）
 * @dependsOn
 *   - utils/tokenCrypto: Token 解密获取用户工号
 *   - utils/tokenMemory: 内存 access token
 *   - stores/auth: 认证状态 store
 *   - types/notification: 通知类型
 */
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getDecryptedToken } from '@/utils/tokenCrypto'
import { getInMemoryAccessToken } from '@/utils/tokenMemory'
import { useAuthStore } from '@/stores/auth'
import type { NotificationItem } from '@/types/notification'

// 【BF-002 建议1】同源相对路径: dev 经 Vite /ws 代理(5173)转发, 生产经 nginx location /ws/ 转发。
// 消除 ws://127.0.0.1:8000 直连的双 host 结构(cookie 按 host 隔离的潜在坑);
// 特殊/独立部署时可用 VITE_WS_BASE_URL 显式指定完整 ws(s):// 地址。
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || ''

type WSMessage = { type: string; data?: NotificationItem; message?: string }

export function useNotificationConnection() {
  const isConnected = ref(false)
  const isConnectionExhausted = ref(false)

  let ws: WebSocket | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  // [BF-095/I-9①] 主动关闭标志：disconnect 后异步 onclose 不得再 scheduleReconnect 复活
  let intentionallyClosed = false
  const MAX_RECONNECT_ATTEMPTS = 10
  const RECONNECT_DELAY = 3000
  const messageHandlers = new Set<(data: WSMessage) => void>()

  /**
   * 获取当前用户的工号（优先读 authStore，降级读 localStorage）
   * cookie 通道 authInfo 已持久化，store 为单一事实来源（DR-1）
   */
  function getJobcode(): string | null {
    try {
      const authStore = useAuthStore()
      const parsed = authStore.authInfo
      const raw = parsed
        ? { auth_username: parsed.auth_username }
        : (() => {
            const saved = getDecryptedToken('authInfo')
            return saved ? (JSON.parse(saved) as { auth_username?: string }) : null
          })()
      return raw?.auth_username || null
    } catch {
      // ignore
    }
    return null
  }

  /**
   * 获取当前用户的 access token
   * 优先级：内存（cookie 通道）→ authStore（登录/刷新后）→ localStorage（bearer 通道）
   */
  function getAccessToken(): string | null {
    const authStore = useAuthStore()
    return getInMemoryAccessToken() || authStore.access_token || getDecryptedToken('access_token')
  }

  /**
   * 建立 WebSocket 连接（携带 JWT token 进行认证）
   */
  function connect() {
    const jobcode = getJobcode()
    if (!jobcode) return

    const token = getAccessToken()
    if (!token) return

    // [BF-095/I-9②] 入口先关旧连接：防旧 socket 孤儿化（双 onmessage 分发 / 句柄泄漏）
    if (ws) {
      ws.onclose = null
      ws.onerror = null
      ws.close()
      ws = null
    }
    stopHeartbeat()
    intentionallyClosed = false

    const url = `${WS_BASE_URL}/ws/notifications/${jobcode}/`

    ws = new WebSocket(url, [token])

    ws.onopen = () => {
      isConnected.value = true
      reconnectAttempts = 0
      startHeartbeat()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage
        messageHandlers.forEach((handler) => handler(data))
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = (event) => {
      isConnected.value = false
      stopHeartbeat()
      // [BF-095/I-9①] 主动断开（disconnect）后的异步 onclose 不复活连接
      if (intentionallyClosed) return
      // 4401 无效/过期 token、4403 无权限 → 认证失效，停止自动重连，提示重新登录
      if (event.code === 4401 || event.code === 4403) {
        isConnectionExhausted.value = true
        ElMessage.warning('实时通知连接已断开，请重新登录')
        return
      }
      scheduleReconnect()
    }

    ws.onerror = () => {
      isConnected.value = false
    }
  }

  /**
   * 心跳保活
   */
  function startHeartbeat() {
    // [BF-095/I-9③] 先清旧 timer：防 onopen 二次触发时 setInterval 叠加成双心跳
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  /**
   * 断线重连
   */
  function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      isConnectionExhausted.value = true
      ElMessage.warning('实时通知连接已断开，请检查网络或点击重新连接')
      return
    }
    reconnectTimer = setTimeout(
      () => {
        reconnectAttempts++
        connect()
      },
      RECONNECT_DELAY * Math.min(reconnectAttempts + 1, 5),
    )
  }

  const manualReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    reconnectAttempts = 0
    isConnectionExhausted.value = false
    connect()
  }

  /**
   * 断开连接
   */
  function disconnect() {
    // [BF-095/I-9①] 先置主动关闭标志：随后的 ws.close() 触发的异步 onclose 见此标志直接返回
    intentionallyClosed = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    stopHeartbeat()
    if (ws) {
      ws.close()
      ws = null
    }
    isConnected.value = false
  }

  /**
   * 订阅 WebSocket 消息（连接件负责解析分发，订阅方处理业务）
   */
  function onMessage(handler: (data: WSMessage) => void) {
    messageHandlers.add(handler)
  }

  /**
   * 通过当前连接发送消息，未连接时静默丢弃
   */
  function send(data: unknown): boolean {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
      return true
    }
    return false
  }

  // [BF-095/I-9④] 登录态复位：4401 置 exhausted 后，token 变化（重新登录/静默刷新）时
  // 清零尝试次数并重连。正常续期（exhausted=false）不触发任何连接动作。
  // watch 在组件 setup 上下文创建，随组件卸载自动销毁。
  const authStore = useAuthStore()
  watch(
    () => authStore.access_token,
    (token) => {
      if (!token || !isConnectionExhausted.value) return
      reconnectAttempts = 0
      isConnectionExhausted.value = false
      connect()
    },
  )

  return {
    isConnected,
    isConnectionExhausted,
    connect,
    disconnect,
    manualReconnect,
    onMessage,
    send,
  }
}
