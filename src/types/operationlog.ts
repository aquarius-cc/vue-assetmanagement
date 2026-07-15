/**
 * 操作日志数据模型
 * 对应后端接口: /api/assets/operation-logs/
 * 所有字段名采用 snake_case 与后端保持一致
 */

// ==================== 枚举类型定义 ====================

/**
 * 操作类型枚举
 * 与后端 operation_type 字段对应
 */
export enum OperationType {
  /** 新增 */
  CREATE = 'create',
  /** 更新 */
  UPDATE = 'update',
  /** 删除 */
  DELETE = 'delete',
  /** 出库 */
  OUT = 'out',
  /** 回收 */
  RECYCLE = 'recycle',
  /** 报损 */
  DAMAGED = 'damaged',
  /** 报废 */
  WASTE = 'waste',
  /** 审批 */
  APPROVE = 'approve',
  /** 转移 */
  TRANSFER = 'transfer',
  /** 状态变更 */
  STATE_CHANGE = 'state_change',
}

// ==================== 基础接口定义 ====================

// export interface AfterData extends AssetDetail {
//   /** 数据 */
// }
// export interface BeforeData extends AssetDetail {
//   /** 数据 */
// }

/**
/**
 * 操作日志接口
 * 对应后端序列化器返回的完整数据
 */
export interface OperationLog {
  /** 主键 ID */
  id: number
  /** 日志唯一标识 */
  logging_id: string
  /** 资产编码 */
  asset_code: string
  /** 资产名称（序列化器 source='operation_asset.asset_name'） */
  asset_name: string
  /** 资产规格（序列化器 source='operation_asset.asset_specification'） */
  asset_specification: string
  /** 变更后数据 */
  after_data: Record<string, unknown>
  /** 变更前数据 */
  before_data: Record<string, unknown>
  /** 操作类型（枚举值） */
  operation_type: OperationType | string
  /** 操作人工号 */
  operator_jobcode: string
  /** 操作人姓名 */
  operator_name: string
  /** 操作时间（ISO 格式字符串） */
  operation_time: string
  /** 操作描述 */
  description: string
  /** 关联记录编码 */
  related_record_code: string | null
  /** 关联记录类型 */
  related_record_type: string | null
  /** IP 地址 */
  ip_address: string
}

// ==================== 查询参数接口 ====================

/**
 * 操作日志查询参数接口
 * 用于操作日志列表查询时的筛选条件
 */
export interface OperationLogQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 资产编码（精确筛选） */
  asset_code?: string
  /** 操作类型（精确筛选） */
  operation_type?: string
  /** 操作人工号（精确筛选） */
  operator_jobcode?: string
  /** 开始日期（格式: YYYY-MM-DD） */
  start_date?: string
  /** 结束日期（格式: YYYY-MM-DD） */
  end_date?: string
  /** 最近天数（与 start_date/end_date 二选一） */
  days?: number
  /** 排序字段（如: -operation_time 表示按操作时间倒序） */
  ordering?: string
  /** 索引签名：允许任意 string key，值必须是基础类型 */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 操作日志列表响应接口
 */
export interface OperationLogListResponse {
  /** 总记录数 */
  count: number
  /** 下一页链接 */
  next: string | null
  /** 上一页链接 */
  previous: string | null
  /** 操作日志列表数据 */
  results: OperationLog[]
}

// ==================== 辅助映射常量 ====================

/**
 * 操作类型中文映射
 * 用于在列表和详情页面展示操作类型的中文名称
 */
export const operationTypeMapping: Record<string, string> = {
  [OperationType.CREATE]: '新增',
  [OperationType.UPDATE]: '更新',
  [OperationType.DELETE]: '删除',
  [OperationType.OUT]: '出库',
  [OperationType.RECYCLE]: '回收',
  [OperationType.DAMAGED]: '报损',
  [OperationType.WASTE]: '报废',
  [OperationType.APPROVE]: '审批',
  [OperationType.TRANSFER]: '转移',
  [OperationType.STATE_CHANGE]: '状态变更',
}

/**
 * 操作类型标签颜色映射
 * 用于 el-tag 组件的 type 属性，不同操作类型使用不同颜色
 */
export const operationTypeTagMapping: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'default'> = {
  [OperationType.CREATE]: 'success',
  [OperationType.UPDATE]: 'primary',
  [OperationType.DELETE]: 'danger',
  [OperationType.OUT]: 'warning',
  [OperationType.RECYCLE]: 'info',
  [OperationType.DAMAGED]: 'danger',
  [OperationType.WASTE]: 'info',
  [OperationType.APPROVE]: 'success',
  [OperationType.TRANSFER]: 'primary',
  [OperationType.STATE_CHANGE]: 'warning',
}
