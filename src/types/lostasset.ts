/**
 * 遗失资产数据模型
 * 对应后端数据库表: am_lost_asset
 */

// ==================== 枚举类型定义 ====================

/**
 * 遗失状态枚举
 * pending: 待处理
 * found: 已找回
 */
export enum LostStatus {
  PENDING = 'pending',
  FOUND = 'found',
}

// ==================== 基础接口定义 ====================

/**
 * 遗失资产创建表单接口
 * 用于创建遗失资产时的表单数据
 */
export interface LostAssetCreateForm {
  /** FK to Asset.recordcode (write_only in serializer) */
  asset_recordcode: string
  /** Last known location */
  last_known_location?: string | null
  /** Lost date */
  lost_date?: string | null
  /** Lost reason */
  lost_reason: string
  /** Lost description (optional) */
  lost_description?: string | null
}

/**
 * 遗失资产更新表单接口
 * 用于更新遗失资产信息时的表单数据
 */
export interface LostAssetUpdateForm extends Partial<LostAssetCreateForm> {
  /** 主键 ID (用于定位要更新的记录) */
  id?: number
}

/**
 * 遗失资产基础接口
 * 对应后端数据库表 am_lost_asset 的基础字段
 */
export interface LostAsset {
  /** 主键 ID */
  id: number
  /** 后端记录编码 */
  recordcode: string
  /** 关联资产编码 (FK → am_asset.recordcode) */
  asset_code: string
  /** 遗失数量 */
  lost_asset_number: number
  /** 遗失日期 */
  lost_date: string
  /** 遗失原因 */
  lost_reason: string
  /** 遗失描述 */
  lost_description: string | null
  /** 最后已知位置 */
  last_known_location: string | null
  /** 操作人工号 (FK → employee_jobcode, nullable) */
  operator_jobcode?: string
  /** Created at */
  created_at: string
  /** Updated at */
  updated_at: string
  /** Soft delete flag */
  is_deleted: boolean
}

/**
 * 遗失资产扩展接口
 * 包含关联对象的完整数据
 */
export interface LostAssetExtended extends LostAsset {
  /** Asset name (from related Asset) */
  asset_name?: string
  /** Lost asset name */
  lost_asset_name?: string
  /** Operator name */
  operator_name?: string
  /** Lost asset specification */
  lost_asset_specification?: string
  /** Asset current status */
  asset_current_status?: string
}

// ==================== 查询参数接口 ====================

/**
 * 遗失资产查询参数接口
 * 用于遗失资产列表查询时的筛选条件
 */
export interface LostAssetQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 资产编码 */
  asset_code?: string
  /** 遗失日期 */
  lost_date?: string
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意 string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 遗失资产列表响应接口
 */
export interface LostAssetListResponse {
  /** 总记录数 */
  count: number
  /** 下一页链接 */
  next: string | null
  /** 上一页链接 */
  previous: string | null
  /** 遗失资产列表数据 */
  results: LostAssetExtended[]
}

// ==================== 批量创建接口 ====================

/**
 * 批量创建遗失记录 - 单条数据
 */
export interface LostAssetBatchItem {
  /** 资产编码 */
  asset_code: string
  /** 遗失日期 */
  lost_date: string
  /** 遗失原因 */
  lost_reason: string
  /** 遗失描述 */
  lost_description?: string
}

/**
 * 批量创建遗失记录请求
 */
export interface LostAssetBatchCreateForm {
  /** 遗失记录列表 */
  items: LostAssetBatchItem[]
}

/**
 * 批量创建遗失记录响应
 */
export interface LostAssetBatchCreateResult {
  total: number
  success_count: number
  fail_count: number
  success_items: LostAssetExtended[]
  fail_items: Array<{
    index: number
    error_code: string
    error_message: string
    input_data: LostAssetBatchItem
    row_number?: number
  }>
}