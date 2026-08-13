/**
 * @file 找回资产数据模型定义，包括找回表单、详情等类型
 * @module types/foundasset
 * @exports
 *   - FoundAssetCreateForm/FoundAssetUpdateForm: 找回资产表单接口
 *   - FoundAsset/FoundAssetExtended: 找回资产基础与扩展接口
 *   - FoundAssetQueryParams: 找回资产查询参数
 *   - FoundAssetListResponse: 找回资产列表响应接口
 * @callers
 *   - stores/foundassetStore（找回资产状态管理）
 *   - composables/*（组合式函数）
 *   - components/*（组件）
 */

import type { PaginatedResponse } from '@/types/common'

/**
 * FoundAsset data model
 * Backend table: am_found_asset
 */

export interface FoundAssetCreateForm {
  lost_asset_recordcode: string
  asset_recordcode: string
  found_date?: string | null
  found_location?: string | null
  found_description?: string | null
}

export interface FoundAssetUpdateForm extends Partial<FoundAssetCreateForm> {
  id?: number
}

export interface FoundAsset {
  id: number
  recordcode: string
  lost_asset_recordcode: string
  asset_recordcode: string
  found_date: string
  found_location: string | null
  found_description: string | null
  created_at: string
  updated_at: string
  is_deleted: boolean
}

export interface FoundAssetExtended extends FoundAsset {
  lost_asset_code?: string
  asset_code?: string
  asset_name?: string
  asset_specification?: string | null
  operator_name?: string
  operator_jobcode?: string
}

export interface FoundAssetQueryParams {
  page?: number
  page_size?: number
  search?: string
  asset_code?: string
  found_date?: string
  ordering?: string
  [key: string]: string | number | boolean | null | undefined
}

/** 找回资产列表响应 */
export type FoundAssetListResponse = PaginatedResponse<FoundAssetExtended>
