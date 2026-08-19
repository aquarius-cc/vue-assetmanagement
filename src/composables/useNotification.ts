/**
 * @file WebSocket 实时通知（连接管理、心跳保活、标记已读）
 * @module composables/useNotification.ts
 * @exports
 *   - useNotification: 通知 composable
 *   - NotificationItem: 通知项类型（re-export）
 * @description
 *   - 提供 WebSocket 实时通知的 composable 函数
 *   - 包含连接管理、心跳保活、未读计数、标记已读等功能
 *   - 通知项类型（NotificationItem）重新导出（re-export）
 * @callers
 *   - components/commoncomponents/NotificationBell.vue
 *   - views/NotificationList.vue
 * @returns
 *   - useNotification: 通知 composable 函数
 * @dependsOn
 *   - api/notification: 通知 REST API
 *   - types/notification: 通知类型定义
 *   - utils/tokenCrypto: Token 解密获取用户工号
 * @example
 *   - 通知 composable 函数调用示例
 *   ```ts
 *   import { useNotification } from '@/composables/useNotification'
 *   const { notifications, unreadCount, isConnected, isLoading } = useNotification()
 *   ```
 * @todo
 *   - [ ] 通知 composable 函数的测试用例
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { isAxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { getDecryptedToken } from '@/utils/tokenCrypto'
import { getInMemoryAccessToken } from '@/utils/tokenMemory'
import { useAuthStore } from '@/stores/auth'
import { notificationAPI } from '@/api/notification'
import type { NotificationItem } from '@/types/notification'

// 重新导出类型，保持向后兼容
export type { NotificationItem as Notification } from '@/types/notification'

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://127.0.0.1:8000'

// 新增状态
const isMarkingAll = ref(false)
const fetchError = ref(false)

export function useNotification() {
  const notifications = ref<NotificationItem[]>([])
  const unreadCount = ref(0)
  const isConnected = ref(false)
  const isLoading = ref(false)

  let ws: WebSocket | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 10
  const RECONNECT_DELAY = 3000
  const isConnectionExhausted = ref(false)

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

    const url = `${WS_BASE_URL}/ws/notifications/${jobcode}/`

    ws = new WebSocket(url, [token])

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

    ws.onclose = (event) => {
      isConnected.value = false
      stopHeartbeat()
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
   * 处理 WebSocket 消息
   */
  function handleWSMessage(data: { type: string; data?: NotificationItem; message?: string }) {
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
  // markAllAsRead 重构
  async function markAllAsRead() {
    if (isMarkingAll.value) return // [修复] 防重复点击
    isMarkingAll.value = true
    try {
      await notificationAPI.markAllRead()
      notifications.value.forEach((n) => {
        n.is_read = true
      })
      unreadCount.value = 0
      ElMessage.success('已全部标记为已读') // [修复] 新增成功反馈
    } catch (err) {
      console.error('标记全部已读失败:', err)
      // [修复] 分类处理：业务错误拦截器未处理，需手动提示
      if (!isAxiosError(err)) {
        ElMessage.error((err as Error).message || '标记全部已读失败')
      }
      // AxiosError 由拦截器已弹窗，不重复
    } finally {
      isMarkingAll.value = false
    }
  }

  /**
   * 从 API 加载通知列表
   */
  // fetchNotifications 重构
  async function fetchNotifications(limit = 20) {
    isLoading.value = true
    fetchError.value = false // [修复] 重置错误状态
    try {
      const res = await notificationAPI.getNotifications({ limit })
      const data = res.data
      if (Array.isArray(data)) {
        notifications.value = data
      } else {
        notifications.value = data.results
      }
    } catch (err) {
      console.error('加载通知列表失败:', err)
      // [修复] 分类处理：业务错误拦截器未处理，需手动提示
      if (!isAxiosError(err)) {
        ElMessage.error((err as Error).message || '加载通知列表失败')
      }
      fetchError.value = true // [修复] 设置错误状态
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 从 API 加载未读数量
   */
  async function fetchUnreadCount() {
    try {
      const res = await notificationAPI.getUnreadCount()
      unreadCount.value = res.data.count
    } catch {
      // ignore
    }
  }

  // 自动连接
  onMounted(() => {
    // 清理可能的重连 timer，避免冲突
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    // 重置状态
    reconnectAttempts = 0
    isConnectionExhausted.value = false

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
    isMarkingAll, // [修复] 新增
    fetchError, // [修复] 新增
    isConnectionExhausted, // [修复] 新增
    manualReconnect, // [修复] 新增
  }
}
