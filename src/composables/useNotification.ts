/**
 * WebSocket 通知 composable
 *
 * 连接后端 WebSocket，接收实时通知推送
 * 支持：连接管理、心跳保活、未读计数、通知列表
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { getDecryptedToken } from '@/utils/tokenCrypto'
import { get } from '@/api/request'

export interface Notification {
  id: number
  type: 'approval' | 'status_change' | 'system'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
  is_read: boolean
  related_asset_code?: string
  related_url?: string
  created_at: string
}

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8000'

export function useNotification() {
  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const isConnected = ref(false)
  const isLoading = ref(false)

  let ws: WebSocket | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 10
  const RECONNECT_DELAY = 3000

  /**
   * 获取当前用户的工号（从 localStorage 中提取）
   */
  function getJobcode(): string | null {
    try {
      const authInfo = getDecryptedToken('authInfo')
      if (authInfo) {
        const parsed = JSON.parse(authInfo)
        // authInfo 存储的是 auth_username，用作 WebSocket 连接的 jobcode
        return parsed.auth_username || parsed.employee_jobcode || parsed.jobcode || parsed.id
      }
    } catch {
      // ignore
    }
    return null
  }

  /**
   * 建立 WebSocket 连接
   */
  function connect() {
    const jobcode = getJobcode()
    if (!jobcode) return

    const url = `${WS_BASE_URL}/ws/notifications/${jobcode}/`

    ws = new WebSocket(url)

    ws.onopen = () => {
      isConnected.value = true
      reconnectAttempts = 0
      startHeartbeat()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWSMessage(data)
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      isConnected.value = false
      stopHeartbeat()
      scheduleReconnect()
    }

    ws.onerror = () => {
      isConnected.value = false
    }
  }

  /**
   * 处理 WebSocket 消息
   */
  function handleWSMessage(data: { type: string; data?: Notification; message?: string }) {
    if (data.type === 'notification' && data.data) {
      // 新通知：添加到列表头部 + 未读计数 +1
      notifications.value.unshift(data.data)
      unreadCount.value++
    } else if (data.type === 'pong') {
      // 心跳响应，忽略
    }
    // 'connected' 类型的消息也忽略
  }

  /**
   * 心跳保活
   */
  function startHeartbeat() {
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
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return
    reconnectTimer = setTimeout(
      () => {
        reconnectAttempts++
        connect()
      },
      RECONNECT_DELAY * Math.min(reconnectAttempts + 1, 5),
    )
  }

  /**
   * 断开连接
   */
  function disconnect() {
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
   * 标记通知为已读
   */
  function markAsRead(notificationId: number) {
    const n = notifications.value.find((item) => item.id === notificationId)
    if (n && !n.is_read) {
      n.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      // 通知后端
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'mark_read', notification_id: notificationId }))
      }
    }
  }

  /**
   * 全部标记已读
   */
  function markAllAsRead() {
    notifications.value.forEach((n) => {
      n.is_read = true
    })
    unreadCount.value = 0
  }

  /**
   * 从 API 加载通知列表
   */
  async function fetchNotifications(limit = 20) {
    isLoading.value = true
    try {
      const res = await get<Notification[]>('/notifications/', { limit: String(limit) })
      notifications.value = res.data as unknown as Notification[]
    } catch (err) {
      console.error('加载通知列表失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 从 API 加载未读数量
   */
  async function fetchUnreadCount() {
    try {
      const res = await get<{ count: number }>('/notifications/unread-count/')
      unreadCount.value = (res.data as { count: number }).count
    } catch {
      // ignore
    }
  }

  // 自动连接
  onMounted(() => {
    connect()
    fetchUnreadCount()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    fetchUnreadCount,
  }
}
