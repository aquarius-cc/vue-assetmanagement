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
import { ref, onMounted, onUnmounted, effectScope, type EffectScope } from 'vue'
import { ElMessage } from 'element-plus'
import { notificationAPI } from '@/api/notification'
import { useNotificationConnection } from '@/composables/useNotificationConnection'
import type { NotificationItem } from '@/types/notification'
import { logError } from '@/utils/logger'
import { notifyCallerError } from '@/utils/errorHandler'

// 重新导出类型，保持向后兼容
export type { NotificationItem as Notification } from '@/types/notification'

// 模块级状态（跨实例共享，行为与拆分前一致）
const isMarkingAll = ref(false)
const fetchError = ref(false)

// ==========================================================================
// [M-21] 共享连接单例（仅连接层；数据态 notifications/unreadCount/isLoading
// 维持实例级——桌面铃铛与抽屉铃铛永不同时可见，分实例无实际危害，且避免
// 碎掉既有「initialize with default values」初值断言）
// ==========================================================================
interface SharedNotificationConnection {
  scope: EffectScope
  connection: ReturnType<typeof useNotificationConnection>
  refCount: number
}

let shared: SharedNotificationConnection | null = null

function getSharedConnection(): SharedNotificationConnection {
  if (!shared) {
    // detached scope: 连接层 watch(access_token) 与首个消费者的组件生命周期解耦，
    // 消费者卸载不再使单例失去 token 复位重连能力；scope.stop() 供测试重置
    const scope = effectScope(true)
    const connection = scope.run(() => useNotificationConnection())!
    shared = { scope, connection, refCount: 0 }
  }
  return shared
}

/**
 * [M-21] 仅供测试重置共享连接单例（beforeEach 调用，防跨用例状态污染）。
 * 禁止放宽断言来掩盖状态残留；生产代码不得调用。
 */
export function resetSharedNotificationConnectionForTest() {
  if (shared) {
    shared.scope.stop()
    shared = null
  }
}

export function useNotification() {
  const notifications = ref<NotificationItem[]>([])
  const unreadCount = ref(0)
  const isLoading = ref(false)

  // [M-21] 连接层走模块级单例（同一消费者组共享一条 WebSocket），数据态仍实例级
  const sharedConn = getSharedConnection()
  const {
    isConnected,
    isConnectionExhausted,
    connect,
    disconnect,
    manualReconnect,
    onMessage,
    offMessage,
    send,
  } = sharedConn.connection

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
      logError('composables/useNotification', '标记全部已读失败:', err)
      // [M-RC-09] 单出口：AxiosError 由拦截器已提示，仅非 AxiosError 弹一次
      notifyCallerError(err, '标记全部已读失败')
    } finally {
      isMarkingAll.value = false
    }
  }

  /**
   * 从 API 加载通知列表
   * [P1-02/P2-09] 后端已统一分页信封; unwrapResponse 已剥外层信封, 此处直接消费载荷
   * (与 notificationStore 同构); limit 参数随 P1-02 移除, 改传 page_size
   */
  async function fetchNotifications(pageSize = 20) {
    isLoading.value = true
    fetchError.value = false // [修复] 重置错误状态
    try {
      const data = await notificationAPI.getNotifications({ page_size: pageSize })
      if (Array.isArray(data)) {
        notifications.value = data
      } else {
        notifications.value = data.results
      }
    } catch (err) {
      logError('composables/useNotification', '加载通知列表失败:', err)
      // [M-RC-09] 单出口：AxiosError 由拦截器已提示，仅非 AxiosError 弹一次
      notifyCallerError(err, '加载通知列表失败')
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
      unreadCount.value = res.count
    } catch {
      // ignore
    }
  }

  // 自动连接（[M-21] 引用计数：0→1 才 connect + fetchUnreadCount（消除重复 REST 调用），
  // 归零才 disconnect——防移动端抽屉关闭误断桌面铃铛的连接）
  onMounted(() => {
    sharedConn.refCount++
    if (sharedConn.refCount === 1) {
      connect()
      fetchUnreadCount()
    }
  })

  onUnmounted(() => {
    // [M-21] 卸载必须摘除 handler（offMessage 为唯一注销入口），否则共享单例
    // 上泄漏的 handler 造成重复分发
    offMessage(handleWSMessage)
    sharedConn.refCount--
    if (sharedConn.refCount <= 0) {
      disconnect()
    }
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
