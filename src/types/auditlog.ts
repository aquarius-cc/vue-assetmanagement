/**
 * 通用审计日志数据模型
 * 对应后端 core AuditLog 模型（core_audit_log 表）
 * 记录非资产操作的审计日志（部门、员工、用户等）
 */

// ==================== 枚举类型定义 ====================

/**
 * 操作类型枚举
 * 与后端 AuditLog.OPERATION_TYPE_CHOICES 对齐
 */
export enum AuditOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PERMISSION_CHANGE = 'permission_change',
  STATE_CHANGE = 'state_change',
}

/**
 * 应用标识枚举
 * 与后端 AuditLog.app_label 对齐
 */
export enum AppLabel {
  DEPARTMENT = 'department',
  EMPLOYEE = 'employee',
  AUTHUSER = 'authuser',
}

// ==================== 接口定义 ====================

/**
 * 通用审计日志接口
 */
export interface AuditLog {
  id: number
  record_code: string
  app_label: string
  operation_type: string
  logging_id: string
  operation_time: string
  operator_jobcode: string | null
  operator_name: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  description: string
  ip_address: string | null
}

/**
 * 审计日志查询参数
 */
export interface AuditLogQueryParams {
  page?: number
  page_size?: number
  app_label?: string
  operation_type?: string
  operator_jobcode?: string
  record_code?: string
  start_date?: string
  end_date?: string
  days?: number
  ordering?: string
  [key: string]: string | number | boolean | null | undefined
}

/**
 * 审计日志列表响应
 */
export interface AuditLogListResponse {
  count: number
  next: string | null
  previous: string | null
  results: AuditLog[]
}

// ==================== 映射常量 ====================

export const auditOperationTypeMapping: Record<string, string> = {
  [AuditOperationType.CREATE]: '新增',
  [AuditOperationType.UPDATE]: '更新',
  [AuditOperationType.DELETE]: '删除',
  [AuditOperationType.APPROVE]: '审批',
  [AuditOperationType.LOGIN]: '登录',
  [AuditOperationType.LOGOUT]: '登出',
  [AuditOperationType.PERMISSION_CHANGE]: '权限变更',
  [AuditOperationType.STATE_CHANGE]: '状态变更',
}

export const appLabelMapping: Record<string, string> = {
  [AppLabel.DEPARTMENT]: '部门管理',
  [AppLabel.EMPLOYEE]: '员工管理',
  [AppLabel.AUTHUSER]: '用户认证',
}

export const auditOperationTypeTagMapping: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'default'> = {
  [AuditOperationType.CREATE]: 'success',
  [AuditOperationType.UPDATE]: 'primary',
  [AuditOperationType.DELETE]: 'danger',
  [AuditOperationType.APPROVE]: 'success',
  [AuditOperationType.LOGIN]: 'info',
  [AuditOperationType.LOGOUT]: 'info',
  [AuditOperationType.PERMISSION_CHANGE]: 'warning',
  [AuditOperationType.STATE_CHANGE]: 'warning',
}
