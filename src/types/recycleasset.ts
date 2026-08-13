/**
 * @file 回收资产数据模型定义，包括回收表单、详情、批量创建等类型
 * @module types/recycleasset
 * @exports
 *   - RecycleAssetCreateForm/RecycleAssetUpdateForm: 回收资产表单接口
 *   - RecycleAsset/RecycleAssetExtended: 回收资产基础与扩展接口
 *   - RecycleAssetQueryParams: 回收资产查询参数
 *   - RecycleAssetListResponse: 回收资产列表响应接口
 *   - RecycleAssetBatchItem/RecycleAssetBatchCreateForm/RecycleAssetBatchCreateResult: 批量创建接口
 * @callers
 *   - stores/recycleassetStore（回收资产状态管理）
 *   - composables/*（组合式函数）
 *   - components/*（组件）
 */
import type { PaginatedResponse } from '@/types/common'
import type { AssetDetail } from '@/types/asset'
// ==================== 基础接口定义 ====================

/**
 * 回收资产创建表单接口
 * 用于创建回收资产时的表单数据
 *
 * 字段映射（前端→后端 RecycleAssetSerializer）：
 * - outasset_recordcode →recycle_outasset (SlugRelatedField, slug_field="recordcode")
 * - recycle_asset_storage_code →recycle_asset_storage (SlugRelatedField, slug_field="storage_code")
 * - recycle_asset_recycle_person_jobcode →recycle_asset_recycle_person_jobcode (SlugRelatedField)
 * - recycle_type: 回收原因（新增字段）
 */
export interface RecycleAssetCreateForm {
  /** 出库记录编码 (→recycle_outasset, SlugRelatedField) */
  outasset_recordcode: string
  /** 回收资产编码 (FK →am_asset.recordcode) */
  recycle_asset: string
  /** 回收数量 (default=1) */
  recycle_asset_number: number
  /** [HALT] FE-C1修复：字段名从 recycle_asset_storage_code 改为 recycle_asset_storage，与后端Serializer对齐 */
  recycle_asset_storage: string
  /** 回收人工号(→recycle_asset_recycle_person_jobcode, SlugRelatedField) */
  recycle_asset_recycle_person_jobcode: string
  /** 回收日期 */
  recycle_asset_date: string
  /** 回收原因 */
  recycle_type: string
  /** 回收描述 (optional) */
  recycle_asset_description?: string | null
}

/**
 * 回收资产更新表单接口
 * 用于更新回收资产信息时的表单数据
 */
export interface RecycleAssetUpdateForm extends Partial<RecycleAssetCreateForm> {
  /** 主键 ID (用于定位要更新的记录) */
  id?: number
}

/**
 * 回收资产基础接口
 * 对应后端数据库表 am_recycle_asset 的基础字段
 *
 * 【v1.1.0 注意】recycle_asset_using_person_jobcode 已从后端模型中删除，
 * 使用人信息通过序列化器 FK 的read_only 字段自动获取（using_person_name / using_person_jobcode） */
export interface RecycleAsset {
  /** 主键 ID */
  id: number
  /** 后端记录编码 (与后端recordcode 字段一致，用于 lookup/delete/batchDelete) */
  recordcode: string
  /** 出库记录编码 (OneToOne →am_out_asset.recordcode, PK) */
  outasset_recordcode: string
  /** 回收资产编码 (FK →am_asset.recordcode) */
  recycle_asset: string
  /** 回收数量 */
  recycle_asset_number: number
  /** 回收仓库编码 (FK →am_storage.storage_code) */
  recycle_asset_storage_code: string
  /** 回收人工号(FK →employee_jobcode，序列化器中通过 write_only 字段 recycle_asset_recycle_person_jobcode 映射) */
  recycle_asset_recycle_person_jobcode: string
  /** 回收日期 */
  recycle_asset_date: string
  /** 回收原因 */
  recycle_type: string
  /** 回收描述 */
  recycle_asset_description: string | null
  /** 操作人工号(FK →employee_jobcode，nullable) */
  operator_jobcode?: string
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
  /** 是否活跃标记 */
  is_active?: boolean
}

/**
 * 回收资产扩展接口
 * 包含关联对象的名称字段 */
export interface RecycleAssetExtended extends RecycleAsset {
  /** 资产编码（从关联的Asset 记录获取）*/
  asset_code?: string
  /** 资产名称（从关联的Asset 记录获取）*/
  asset_name?: string
  /** 回收资产名称 */
  recycle_asset_name?: string
  /** 回收资产使用人姓名*/
  using_person_name?: string
  using_person_jobcode?: string
  using_person_department?: string
  /** 回收资产回收人姓名*/
  recycle_person_name?: string
  recycle_person_jobcode?: string
  storage_code?: string
  /** 回收资产仓库名称 */
  recycle_asset_storage_name?: string
  /** 回收资产规格 */
  recycle_person_department?: string
  recycle_asset_specification?: string
  asset?: AssetDetail
}

// ==================== 查询参数接口 ====================

/**
 * 回收资产查询参数接口
 * 用于回收资产列表查询时的筛选条件 */
export interface RecycleAssetQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词*/
  search?: string
  /** 资产编码 */
  asset_code?: string
  /** 回收日期 */
  recycle_date?: string
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/** 回收资产列表响应 */
export type RecycleAssetListResponse = PaginatedResponse<RecycleAssetExtended>

// ==================== 批量创建接口 ====================

/**
 * 批量创建回收记录 - 单条数据
 * 对应后端 RecycleAssetBatchItemSerializer
 */
export interface RecycleAssetBatchItem {
  /** 出库记录编码 (→recycle_outasset_code, SlugRelatedField) */
  recycle_outasset_code: string
  /** 回收日期 */
  recycle_date?: string
  /** 回收原因 (required) */
  recycle_type: string
  /** 回收描述 */
  recycle_description?: string
}

/**
 * 批量创建回收记录请求
 * 对应后端 POST /api/assets/recycle-assets/batch-create/
 */
export interface RecycleAssetBatchCreateForm {
  /** 回收记录列表 */
  items: RecycleAssetBatchItem[]
  /** 回收仓库编码 (顶层共享字段, →recycle_asset_storage) */
  recycle_asset_storage: string
  /** 回收人工号(顶层共享字段, →recycle_asset_recycle_person_jobcode) */
  recycle_asset_recycle_person_jobcode: string
}

/**
 * 批量创建回收记录响应
 */
export interface RecycleAssetBatchCreateResult {
  total: number
  success_count: number
  fail_count: number
  success_items: RecycleAssetExtended[]
  fail_items: Array<{
    index: number
    error_code: string
    error_message: string
    input_data: RecycleAssetBatchItem
    row_number?: number
  }>
}
