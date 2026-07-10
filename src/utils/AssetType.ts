/**
 * 资产类型数据模型
 * 对应后端数据库表: am_asset_type
 */

// ==================== 枚举类型定义 ====================

/**
 * 资产分类类型枚举
 * hardware: 硬件
 * software: 软件
 * lowvalue: 低值易耗
 * other: 其他
 */
export enum AssetTypeCategory {
  HARDWARE = 'hardware',
  SOFTWARE = 'software',
  LOWVALUE = 'lowvalue',
  OTHER = 'other'
}

// ==================== 基础接口定义 ====================

/**
 * 资产类型创建表单接口
 * 用于创建新资产类型时的表单数据
 */
export interface AssetTypeCreateForm {
  /** 资产类型编码 (唯一标识) */
  asset_type_code: string
  /** 资产一级分类名称 */
  asset_type_primary: string
  /** 资产二级分类名称 */
  asset_type_secondary: string
  /** 资产分类类型 (可选) */
  asset_type_category: AssetTypeCategory | string | null
  /** 资产分类描述 (可选) */
  asset_type_description?: string | null
}

/**
 * 资产类型更新表单接口
 * 用于更新资产类型信息时的表单数据
 */
export interface AssetTypeUpdateForm extends Partial<AssetTypeCreateForm> {
  /** 主键 ID (用于定位要更新的记录) */
  asset_type_code: string
}

/**
 * 资产类型基础接口
 * 对应后端数据库表 am_asset_type 的基础字段
 */
export interface AssetType extends AssetTypeCreateForm {
  /** 主键 ID */
  id: number
  /** 唯一记录编码 */
  recordcode: string | null
  /** 创建时间 */
  create_time: string
  /** 更新时间 */
  update_time: string
  /** 是否删除标记 */
  is_delete: boolean
  /** 资产分类类型 */
  asset_type_category: AssetTypeCategory | null
  /** 资产分类描述 */
  asset_type_description: string | null
}

// ==================== 查询参数接口 ====================

/**
 * 资产类型查询参数接口
 * 用于资产类型列表查询时的筛选条件
 */
export interface AssetTypeQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 资产类型编码 */
  asset_type_code?: string
  /** 资产一级分类名称 */
  asset_type_primary?: string
  /** 资产二级分类名称 */
  asset_type_secondary?: string
  /** 资产分类类型 */
  asset_type_category?: string
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意 string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 资产类型列表响应接口
 */
export interface AssetTypeListResponse {
  /** 总记录数 */
  count: number
  /** 下一页链接 */
  next: string | null
  /** 上一页链接 */
  previous: string | null
  /** 资产类型列表数据 */
  results: AssetType[]
}

/**
 * 资产类型简化接口
 * 用于在组件间引用
 */
export interface AssetTypeItem {
  value: string
  asset_type_name: string
  asset_type_code: string
  asset_type_primary: string
  asset_type_secondary: string
}
