/**
 * @file 通用审计日志 API，提供非资产操作的审计日志查询、导出等接口
 * @module api/auditLog
 * @exports
 *   - auditLogAPI: 通用审计日志 API 对象（包含所有审计日志相关方法）
 * @callers
 *   - stores/auditLogStore: 审计日志状态管理
 *   - views/AuditLogManage: 审计日志管理视图
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/auditlog: 审计日志相关类型定义
 */
import { request, unwrapResponse } from '@/api/index'
import type { AuditLog, AuditLogQueryParams, AuditLogListResponse } from '@/types/auditlog'

export const auditLogAPI = {
  /**
   * 获取审计日志列表
   * GET /api/audit-logs/
   */
  getAuditLogs: (params?: AuditLogQueryParams): Promise<AuditLogListResponse> => {
    return unwrapResponse(request.get<AuditLogListResponse>('/audit-logs/', params))
  },

  /**
   * 获取审计日志详情（按主键）
   * GET /api/audit-logs/{pk}/
   */
  getAuditLogDetail: (pk: number | string): Promise<AuditLog> => {
    return unwrapResponse(request.get<AuditLog>(`/audit-logs/${pk}/`, undefined, true, 300000))
  },

  /**
   * 按 logging_id 查询审计日志
   * GET /api/audit-logs/by-logging-id/{logging_id}/
   */
  getAuditLogByLoggingId: (loggingId: string): Promise<AuditLog> => {
    return unwrapResponse(request.get<AuditLog>(`/audit-logs/by-logging-id/${loggingId}/`))
  },

  /**
   * 获取最近N天审计日志
   * GET /api/audit-logs/recent/?days=7
   */
  getRecentAuditLogs: (days: number = 7): Promise<AuditLogListResponse> => {
    return unwrapResponse(request.get<AuditLogListResponse>('/audit-logs/recent/', { days }))
  },

  /**
   * 按应用标识查询审计日志
   * GET /api/audit-logs/by-app/{app_label}/
   */
  getAuditLogsByApp: (
    appLabel: string,
    params?: AuditLogQueryParams,
  ): Promise<AuditLogListResponse> => {
    return unwrapResponse(
      request.get<AuditLogListResponse>(`/audit-logs/by-app/${appLabel}/`, params),
    )
  },

  /**
   * 按操作人查询审计日志
   * GET /api/audit-logs/by-operator/{operator_jobcode}/
   */
  getAuditLogsByOperator: (
    jobcode: string,
    params?: AuditLogQueryParams,
  ): Promise<AuditLogListResponse> => {
    return unwrapResponse(
      request.get<AuditLogListResponse>(`/audit-logs/by-operator/${jobcode}/`, params),
    )
  },
}
