/**
 * 操作日志管理 API
 * 对应后端接口: /api/assets/operation-logs/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  OperationLog,
  OperationLogListResponse,
  OperationLogQueryParams,
} from '@/utils/OperationLog'

/**
 * 操作日志管理 API
 */
export const operationLogAPI = {
  /**
   * 获取操作日志列表
   * @param params 查询参数（分页、筛选、排序等）
   * @returns 操作日志列表响应
   */
  getOperationLogs: (params?: OperationLogQueryParams): Promise<OperationLogListResponse> => {
    return unwrapResponse(request.get<OperationLogListResponse>('/assets/operation-logs/', params))
  },

  /**
   * 获取操作日志详情（启用缓存）
   * @param pk 操作日志主键
   * @returns 操作日志详情
   */
  getOperationLogDetail: (pk: number | string): Promise<OperationLog> => {
    return unwrapResponse(
      request.get(
        `/assets/operation-logs/${pk}/`,
        undefined,
        true, // 使用缓存
        300000, // 缓存时间 5 分钟
      ),
    )
  },

  /**
   * 通过 LoggingId 查询操作日志
   * @param id 日志 ID
   * @returns 操作日志详情
   */
  getOperationLogByLoggingId: (id: string): Promise<OperationLog> => {
    return unwrapResponse(request.get(`/assets/operation-logs/by-logging-id/${id}/`))
  },

  /**
   * 获取最近操作记录
   * @param days 最近天数，默认 7 天
   * @returns 操作日志列表响应
   */
  getRecentOperationLogs: (days: number = 7): Promise<OperationLogListResponse> => {
    return unwrapResponse(
      request.get<OperationLogListResponse>('/assets/operation-logs/recent/', { days }),
    )
  },

  /**
   * 获取用户操作记录
   * @param jobcode 用户工号
   * @param params 额外查询参数（分页等）
   * @returns 操作日志列表响应
   */
  getUserOperationLogs: (
    jobcode: string,
    params?: OperationLogQueryParams,
  ): Promise<OperationLogListResponse> => {
    return unwrapResponse(
      request.get<OperationLogListResponse>(`/assets/operation-logs/user/${jobcode}/`, params),
    )
  },
}
