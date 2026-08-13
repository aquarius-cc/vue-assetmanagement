/**
 * @file 通知 API，提供通知的获取、标记已读等接口
 * @module api/notification
 * @exports
 *   - notificationAPI: 通知 API 对象（包含所有通知相关方法）
 * @callers
 *   - composables/useNotification: 通知组合式函数
 *   - views/NotificationList: 通知列表视图
 * @dependsOn
 *   - api/request.ts: 直接使用 get/post/unwrapResponse
 *   - types/notification: 通知相关类型定义
 */
import { get, post, unwrapResponse } from '@/api/request'
import type {
  NotificationListResponse,
  NotificationFilterParams,
  UnreadCountResponse,
  MarkReadResponse,
} from '@/types/notification'

export const notificationAPI = {
  /**
   * 获取当前用户通知列表
   * @param params 查询参数
   * @returns 通知列表
   */
  getNotifications: (params?: NotificationFilterParams): Promise<NotificationListResponse> => {
    return unwrapResponse(
      get<NotificationListResponse>(
        '/notifications/',
        params as Record<string, string | number | boolean | null | undefined>,
      ),
    )
  },

  /**
   * 获取未读通知数量
   * @returns 未读数量
   */
  getUnreadCount: (): Promise<UnreadCountResponse> => {
    return unwrapResponse(get<UnreadCountResponse>('/notifications/unread-count/'))
  },

  /**
   * 标记单条通知为已读
   * @param notificationId 通知 ID
   * @returns 操作结果
   */
  markRead: (notificationId: number): Promise<MarkReadResponse> => {
    return unwrapResponse(post<MarkReadResponse>(`/notifications/${notificationId}/read/`))
  },

  /**
   * 将当前用户所有未读通知标记为已读
   * @returns 标记数量
   */
  markAllRead: (): Promise<{ code: number; data: { marked_count: number }; message: string }> => {
    return unwrapResponse(post('/notifications/read-all/'))
  },
}
