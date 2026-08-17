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
   * 按 logging_id 查询审计日志
   * GET /api/audit-logs/by-logging-id/{logging_id}/
   */
  getAuditLogByLoggingId: (loggingId: string): Promise<AuditLog> => {
    return unwrapResponse(request.get<AuditLog>(`/audit-logs/by-logging-id/${loggingId}/`))
  },
}
