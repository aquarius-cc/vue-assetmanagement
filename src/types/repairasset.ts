/**
 * 维修资产数据模型
 * 对应后端数据库表: am_repair_asset
 */

// ==================== 枚举类型定义 ====================

/**
 * 维修状态枚举
 * pending: 维修中
 * completed: 维修完成
 * failed: 维修失败
 */
export enum RepairStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// ==================== 基础接口定义 ====================

/**
 * 维修资产创建表单接口
 * 用于创建维修资产时的表单数据
 */
export interface RepairAssetCreateForm {
  /** 资产编码 (FK → am_asset.asset_code) */
  asset_code: string
  /** 维修数量 */
  repair_asset_number: number
  /** 维修日期 */
  repair_date: string
  /** 维修原因 */
  repair_reason: string
  /** 维修描述 (可选) */
  repair_description?: string | null
  /** 操作人工号 (FK → employee_jobcode, 可选) */
  operator_jobcode?: string | null
}

/**
 * 维修资产更新表单接口
 * 用于更新维修资产信息时的表单数据
 */
export interface RepairAssetUpdateForm extends Partial<RepairAssetCreateForm> {
  /** Primary key */
  id?: number
  /** Actual return date (for repair_done) */
  actual_return_date?: string
  /** Physical grade after repair (for repair_done) */
  physical_grade_after?: string
  /** Repair status */
  repair_status?: string
}

/**
 * 维修资产基础接口
 * 对应后端数据库表 am_repair_asset 的基础字段
 */
export interface RepairAsset {
  /** Primary key */
  id: number
  /** Backend record code */
  recordcode: string
  /** FK to Asset.recordcode */
  asset_recordcode: string
  /** Repair date */
  repair_date: string
  /** Repair status: in_progress / completed / failed */
  repair_status: string
  /** Repair reason */
  repair_reason: string
  /** Repair description */
  repair_description: string | null
  /** Operator jobcode */
  operator_jobcode?: string
  /** Created at */
  created_at: string
  /** Updated at */
  updated_at: string
  /** Soft delete flag */
  is_deleted: boolean
}

/**
 * 维修资产扩展接口
 * 包含关联对象的完整数据
 */
export interface RepairAssetExtended extends RepairAsset {
  /** 资产编码（从关联 Asset 记录获取） */
  asset_code?: string
  /** 资产名称（从关联 Asset 记录获取） */
  asset_name?: string
  /** 维修资产名称 */
  repair_asset_name?: string
  /** 操作人姓名 */
  operator_name?: string
  /** 维修资产规格 */
  repair_asset_specification?: string
  /** 资产当前状态 */
  asset_current_status?: string
}

// ==================== 查询参数接口 ====================

/**
 * 维修资产查询参数接口
 * 用于维修资产列表查询时的筛选条件
 */
export interface RepairAssetQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 资产编码 */
  asset_code?: string
  /** 维修日期 */
  repair_date?: string
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意 string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 维修资产列表响应接口
 */
export interface RepairAssetListResponse {
  /** 总记录数 */
  count: number
  /** 下一页链接 */
  next: string | null
  /** 上一页链接 */
  previous: string | null
  /** 维修资产列表数据 */
  results: RepairAssetExtended[]
}

// ==================== 批量创建接口 ====================

/**
 * 批量创建维修记录 - 单条数据
 */
export interface RepairAssetBatchItem {
  /** 资产编码 */
  asset_code: string
  /** 维修日期 */
  repair_date: string
  /** 维修原因 */
  repair_reason: string
  /** 维修描述 */
  repair_description?: string
}

/**
 * 批量创建维修记录请求
 */
export interface RepairAssetBatchCreateForm {
  /** 维修记录列表 */
  items: RepairAssetBatchItem[]
}

/**
 * 批量创建维修记录响应
 */
export interface RepairAssetBatchCreateResult {
  total: number
  success_count: number
  fail_count: number
  success_items: RepairAssetExtended[]
  fail_items: Array<{
    index: number
    error_code: string
    error_message: string
    input_data: RepairAssetBatchItem
    row_number?: number
  }>
}