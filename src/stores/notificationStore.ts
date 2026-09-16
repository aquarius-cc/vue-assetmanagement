/**
 * @file 通知 Store — 通知列表、分页、标记已读
 * @module stores/notificationStore
 * @exports
 *   - useNotificationStore: 通知状态 Store（列表/分页/已读）
 * @callers
 *   - views/NotificationList.vue
 * @dependsOn
 *   - api/notification: 通知 REST API
 *   - types/notification: 通知类型定义
 */
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { notificationAPI } from '@/api/notification'
import type {
  NotificationItem,
  NotificationFilterParams,
  NotificationPaginatedData,
} from '@/types/notification'

/**
 * 通知 Store
 */
export const useNotificationStore = defineStore('notification', () => {
  /** 通知列表 */
  const notifications = ref<NotificationItem[]>([])
  /** 加载状态 */
  const loading = ref(false)
  /** 分页状态 */
  const pagination = reactive({
    page: 1,
    page_size: 20,
    total: 0,
  })

  /**
   * 获取通知列表（支持分页与筛选参数）
   * @param params 查询参数（page/page_size 及筛选条件）
   */
  async function fetchNotifications(params?: NotificationFilterParams) {
    loading.value = true
    try {
      const data = (await notificationAPI.getNotifications(params)) as unknown as
        | NotificationItem[]
        | NotificationPaginatedData
      if (Array.isArray(data)) {
        notifications.value = data
        pagination.total = data.length
      } else {
        notifications.value = data.results || []
        pagination.total = data.count || 0
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * 标记单条通知为已读（成功后同步本地状态）
   * @param notificationId 通知 ID
   */
  async function markRead(notificationId: number) {
    await notificationAPI.markRead(notificationId)
    const item = notifications.value.find((n) => n.id === notificationId)
    if (item) item.is_read = true
  }

  /**
   * 标记所有通知为已读（成功后同步本地状态）
   * @returns 标记数量
   */
  async function markAllRead() {
    const result = await notificationAPI.markAllRead()
    notifications.value.forEach((n) => {
      n.is_read = true
    })
    return result
  }

  return {
    notifications,
    loading,
    pagination,
    fetchNotifications,
    markRead,
    markAllRead,
  }
})
