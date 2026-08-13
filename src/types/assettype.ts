/**
 * @file 资产类型数据模型定义，支持树形结构的资产分类
 * @module types/assettype
 * @exports
 *   - AssetTypeCreateForm: 资产类型创建表单接口
 *   - AssetTypeUpdateForm: 资产类型更新表单接口
 *   - AssetType: 资产类型基础接口
 *   - AssetTypeQueryParams: 资产类型查询参数
 *   - AssetTypeListResponse: 资产类型列表响应接口
 * @callers
 *   - stores/assettypeStore（资产类型状态管理）
 *   - composables/*（组合式函数）
 *   - components/*（组件）
 */

// ==================== 基础接口定义 ====================

/**
 * 资产类型创建表单接口
 * 用于创建新资产类型时的表单数据
 */
export interface AssetTypeCreateForm {
  /** 资产类型编码 (唯一标识) */
  type_code: string
  /** 资产类型名称 */
  type_name: string
  /** 父级资产类型业务编码 (可选，顶级为 null) */
  parent_type_code?: string | null
  /** 层级，顶级为 0 */
  level?: number
  /** 资产类型描述 */
  type_description?: string | null
  /** 排序权重，数字越小越靠前 */
  sort_order?: number
}

/**
 * 资产类型更新表单接口
 * 用于更新资产类型信息时的表单数据
 */
export interface AssetTypeUpdateForm extends Partial<AssetTypeCreateForm> {
  /** recordcode (用于定位要更新的记录) */
  recordcode: string
}

/**
 * 资产类型基础接口
 * 对应后端数据库表 am_asset_type 的基础字段
 */
export interface AssetType {
  /** recordcode (唯一标识) */
  recordcode: string
  /** 资产类型编码 */
  type_code: string
  /** 资产类型名称 */
  type_name: string
  /** 父级资产类型 FK ID (recordcode) */
  parent: string | null
  /** 父级资产类型业务编码 */
  parent_type_code: string | null
  /** 物化路径 */
  path: string
  /** 层级，顶级为 0 */
  level: number
  /** 资产类型描述 */
  type_description: string | null
  /** 排序权重 */
  sort_order: number
  /** 是否激活 */
  is_active: boolean
  /** 子类型列表 */
  children?: AssetType[]
}

// ==================== 查询参数接口 ====================

/**
 * 资产类型查询参数接口
 */
export interface AssetTypeQueryParams {
  page?: number
  page_size?: number
  search?: string
  type_code?: string
  type_name?: string
  level?: number
  ordering?: string
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 资产类型列表响应接口
 */
export interface AssetTypeListResponse {
  count: number
  next: string | null
  previous: string | null
  results: AssetType[]
}

/**
 * 资产类型简化接口
 */
