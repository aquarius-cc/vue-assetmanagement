/**
 * 待报废资产数据模型
 * 对应后端数据库表: am_damaged_asset
 */

// ==================== 枚举类型定义 ====================

/**
 * 审批状态枚举
 * pending: 待审批
 * approved: 已批准
 * rejected: 已拒绝
 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// ==================== 基础接口定义 ====================

/**
 * 待报废资产创建表单接口
 * 用于创建待报废资产时的表单数据
 *
 * 后端 v1.1.0 将 damaged_asset_contract_code 和 damaged_asset_storage_code 改为 read_only（通过 asset_code 关联自动获取），前端传递会被忽略但不会报错
 */
export interface DamagedAssetCreateForm {
  /** 待报废资产编码 (一对一关联 am_asset.asset_code, 可选) */
  damaged_asset_code?: string | null
  /** 待报废日期 (可选) */
  damaged_date?: string | null
  /** 待报废数量 */
  damaged_asset_number: number
  /** 审批状态 (可选) */
  approval_status?: ApprovalStatus | string | null
  /** 审批人 (外键关联 auth_user_management_table, 可选) */
  approver?: string | null
  /** [HR-03] read_only 合同编码 (外键关联 am_contract.contract_code, 可选) */
  damaged_asset_contract_code?: string | null
  /** [HR-03] read_only 待报废仓库编码 (外键关联 am_storage.storage_code) */
  damaged_asset_storage_code: string
  /** 待报废描述 (可选) */
  damaged_asset_description?: string | null
}

/**
 * 待报废资产更新表单接口
 * 用于更新待报废资产信息时的表单数据
 */
export interface DamagedAssetUpdateForm extends Partial<DamagedAssetCreateForm> {
  /** 主键 ID (用于定位要更新的记录) */
  id?: number
}

/**
 * 待报废资产基础接口
 * 对应后端数据库表 am_damaged_asset 的基础字段
 */
export interface DamagedAsset extends DamagedAssetCreateForm {
  /** 主键 ID */
  id: number
  /** 后端记录编码 */
  recordcode: string
  /** 关联资产编码 (后端字段名 damaged_asset, OneToOne → Asset.recordcode, 用于 lookup/delete) */
  damaged_asset: string
  /** 创建时间 */
  create_time: string
  /** 更新时间 */
  update_time: string
  /** 是否删除标记 */
  is_delete: boolean
  /** 资产名称 */
  damaged_asset_name: string
  /** 合同名称 */
  damaged_asset_contract_name: string
  /** 仓库名称 */
  damaged_asset_storage_name: string
  /** 规格型号 */
  damaged_asset_specification: string | null
}

// ==================== 查询参数接口 ====================

/**
 * 待报废资产查询参数接口
 * 用于待报废资产列表查询时的筛选条件
 */
export interface DamagedAssetQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 待报废资产编码 */
  damaged_asset_code?: string
  /** 损坏日期 */
  damage_date?: string
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意 string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 待报废资产列表响应接口
 */
export interface DamagedAssetListResponse {
  /** 总记录数 */
  count: number
  /** 下一页链接 */
  next: string | null
  /** 上一页链接 */
  previous: string | null
  /** 待报废资产列表数据 */
  results: DamagedAsset[]
}
