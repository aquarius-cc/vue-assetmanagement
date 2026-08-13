/**
 * @file 报废资产数据模型定义，包括报废表单、详情、统计等类型
 * @module types/wasteasset
 * @exports
 *   - WasteAssetCreateForm/WasteAssetUpdateForm: 报废资产表单接口
 *   - WasteAsset: 报废资产基础接口
 *   - WasteAssetQueryParams: 报废资产查询参数
 *   - WasteAssetListResponse: 报废资产列表响应接口
 *   - WasteAssetStats: 报废资产统计接口
 * @callers
 *   - stores/wasteassetStore（报废资产状态管理）
 *   - composables/*（组合式函数）
 *   - components/*（组件）
 */

import type { PaginatedResponse } from '@/types/common'

/**
 * 报废资产数据模型
 * 对应后端数据库表: am_waste_asset
 */

// ==================== 基础接口定义 ====================

/**
 * 报废资产创建表单接口
 * 用于创建报废资产时的表单数据
 */
export interface WasteAssetCreateForm {
  /** 报废资产编码 (一对一关联 am_asset.asset_code) */
  waste_asset_code: string
  /** 合同编码 (外键关联 am_contract.contract_code) */
  waste_asset_contract_code: string
  /** 报废数量 */
  waste_asset_number: number
  /** 报废日期 */
  waste_asset_date: string
  /** 报废描述 (可选) */
  waste_asset_description?: string | null
}

/**
 * 报废资产更新表单接口
 * 用于更新报废资产信息时的表单数据
 */
export interface WasteAssetUpdateForm extends Partial<WasteAssetCreateForm> {
  /** 主键 ID (用于定位要更新的记录) */
  id?: number
}

/**
 * 报废资产基础接口
 * 对应后端数据库表 am_waste_asset 的基础字段
 * 注意：后端序列化器返回的字段名与数据库字段名有所不同
 */
export interface WasteAsset {
  /** 主键 ID */
  id?: number
  /** 创建时间 */
  created_at?: string
  /** 更新时间 */
  updated_at?: string
  /** 是否删除标记 */
  is_deleted?: boolean
  /** 关联资产编码 (OneToOne → Asset.recordcode, 用于 lookup/delete) */
  waste_asset: string
  /** 资产编号 (Asset.asset_code, 后端 readonly extra 字段, 用于 URL lookup) */
  asset_code: string
  /** 资产编码 (来自 waste_asset_code.damaged_asset_code.asset_code) */
  waste_asset_code: string
  /** 资产名称 (来自 waste_asset_code.damaged_asset_code.asset_name) */
  asset_name: string
  /** 合同编码 (外键) */
  waste_asset_contract_code: string
  /** 合同名称 (来自 waste_asset_contract_code.damaged_asset_contract_code.contract_name) */
  contract_name: string
  /** 报废数量 */
  waste_asset_number: number
  /** 报废日期 */
  waste_asset_date: string
  /** 报废描述 */
  waste_asset_description: string | null
  /** 资产规格型号 (来自 waste_asset_code.damaged_asset_code.asset_specification) */
  waste_asset_specification: string
  /** 是否有效 */
  is_active?: boolean
}

// ==================== 查询参数接口 ====================

/**
 * 报废资产查询参数接口
 * 用于报废资产列表查询时的筛选条件
 */
export interface WasteAssetQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 资产编码 */
  asset_code?: string
  /** 报废日期 */
  waste_asset_date?: string
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意 string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/** 报废资产列表响应 */
export type WasteAssetListResponse = PaginatedResponse<WasteAsset>

// ==================== 统计接口 ====================

/**
 * 报废资产统计接口
 */
export interface WasteAssetStats {
  /** 总报废资产数 */
  total_waste_assets: number
  /** 本年报废数 */
  this_year_waste: number
  /** 月度报废统计 */
  monthly_waste: Array<{
    /** 月份 */
    month: number
    /** 数量 */
    count: number
  }>
}
