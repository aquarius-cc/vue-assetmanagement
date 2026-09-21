/**
 * @file WebSocket 实时通知（数据管理：未读计数、标记已读、列表加载）
 * @module composables/useNotification
 * @exports
 *   - useNotification: 通知 composable
 *   - Notification: 通知项类型（re-export，向后兼容）
 * @description
 *   - 提供 WebSocket 实时通知的 composable 函数
 *   - 连接/心跳/重连职责已下沉至 useNotificationConnection（FR-6 拆分）
 * @callers
 *   - components/commoncomponents/NotificationBell.vue
 * @dependsOn
 *   - composables/useNotificationConnection: WebSocket 连接管理
 *   - api/notification: 通知 REST API
 *   - types/notification: 通知类型定义
 * @returns
 *   - useNotification: 通知 composable 函数（返回形状与拆分前一致）
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { isAxiosError } from 'axios'
import { ElMessage } from 'element-plus'
import { notificationAPI } from '@/api/notification'
import { useNotificationConnection } from '@/composables/useNotificationConnection'
import type { NotificationItem } from '@/types/notification'

// 重新导出类型，保持向后兼容
export type { NotificationItem as Notification } from '@/types/notification'

// 模块级状态（跨实例共享，行为与拆分前一致）
const isMarkingAll = ref(false)
const fetchError = ref(false)

export function useNotification() {
  const notifications = ref<NotificationItem[]>([])
  const unreadCount = ref(0)
  const isLoading = ref(false)

  const {
    isConnected,
    isConnectionExhausted,
    connect,
    disconnect,
    manualReconnect,
    onMessage,
    send,
  } = useNotificationConnection()

  /**
   * 处理 WebSocket 消息
   */
  function handleWSMessage(data: { type: string; data?: NotificationItem; message?: string }) {
    if (data.type === 'notification' && data.data) {
      // 新通知：添加到列表头部 + 未读计数 +1
      notifications.value.unshift(data.data)
      unreadCount.value++
    }
    // 'pong' 与 'connected' 类型的消息忽略
  }

  onMessage(handleWSMessage)

  /**
   * 标记通知为已读
   */
  function markAsRead(notificationId: number) {
    const n = notifications.value.find((item) => item.id === notificationId)
    if (n && !n.is_read) {
      n.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
      // 通知后端
      send({ type: 'mark_read', notification_id: notificationId })
    }
  }

  /**
   * 全部标记已读
   */
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
