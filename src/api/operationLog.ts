/**
 * @file 操作日志管理 API，提供操作日志的查询、导出等接口
 * @module api/operationLog
 * @exports
 *   - operationLogAPI: 操作日志管理 API 对象（包含所有操作日志相关方法）
 * @callers
 *   - stores/operationLogStore: 操作日志状态管理
 *   - views/OperationLogManage: 操作日志管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/operationlog: 操作日志相关类型定义
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  OperationLog,
  OperationLogListResponse,
  OperationLogQueryParams,
} from '@/types/operationlog'

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
}
