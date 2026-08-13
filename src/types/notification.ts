/**
 * @file 通知模块数据模型定义，包括通知类型、优先级、列表响应等类型
 * @module types/notification
 * @exports
 *   - NotificationType: 通知类型
 *   - NotificationPriority: 通知优先级
 *   - NotificationItem: 通知项接口
 *   - NotificationListResponse: 通知列表响应接口
 *   - NotificationPaginatedData: 通知分页数据接口
 *   - NotificationFilterParams: 通知筛选参数接口
 *   - UnreadCountResponse/MarkReadResponse: 通知操作响应接口
 * @callers
 *   - composables/useNotification（通知组合式函数）
 *   - api/notification（通知API）
 *   - components/*（组件）
 */

/** 通知类型 */
export type NotificationType = 'approval' | 'status_change' | 'system'

/** 通知优先级 */
export type NotificationPriority = 'low' | 'medium' | 'high'

/** 通知项 */
export interface NotificationItem {
  id: number
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  is_read: boolean
  related_asset_code: string | null
  related_url: string | null
  created_at: string
}

/** 通知列表响应 */
export interface NotificationListResponse {
  code: number
  data: NotificationItem[] | NotificationPaginatedData
  message: string
}

/** 通知分页数据 */
export interface NotificationPaginatedData {
  results: NotificationItem[]
  count: number
  total_pages: number
  page: number
  page_size: number
}

/** 通知筛选参数 */
export interface NotificationFilterParams {
  is_read?: boolean
  notification_type?: string
  priority?: string
  keyword?: string
  page?: number
  page_size?: number
  limit?: number
}

/** 未读数量响应 */
export interface UnreadCountResponse {
  code: number
  data: { count: number }
  message: string
}

/** 标记已读响应 */
export interface MarkReadResponse {
  code: number
  data: null
  message: string
}
