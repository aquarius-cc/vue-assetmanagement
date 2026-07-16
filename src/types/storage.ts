/**
 * 仓库数据模型
 * 对应后端数据库表: am_storage
 */

// ==================== 枚举类型定义 ====================

/**
 * 仓库类型枚举
 * newasset: 新货仓库
 * recycle: 回收仓库
 * damaged: 待报废仓库
 */
export enum StorageType {
  NEWASSET = 'newasset',
  RECYCLE = 'recycle',
  DAMAGED = 'damaged',
}

// ==================== 基础接口定义 ====================

/**
 * 仓库创建表单接口
 * 用于创建新仓库时的表单数据
 */
export interface StorageCreateForm {
  /** 仓库编码 (唯一标识) */
  storage_code: string
  /** 仓库名称 */
  storage_name: string
  /** 仓库地址 (可选) */
  storage_address?: string | null
  /** 仓库类型 (可选) */
  storage_type?: StorageType | string | null
  /** 仓库描述 (可选) */
  storage_description?: string | null
}

/**
 * 仓库更新表单接口
 * 用于更新仓库信息时的表单数据
 */
export interface StorageUpdateForm extends Partial<StorageCreateForm> {
  /** 仓库编码 (唯一标识，用于定位要更新的记录) */
  storage_code: string
}

/**
 * 仓库基础接口
 * 对应后端数据库表 am_storage 的基础字段
 */
export interface Storage extends StorageCreateForm {
  /** 记录编码 (由后端自动生成，用于业务关联) */
  recordcode: string
  /** 主键 ID */
  id: number
  /** 创建时间 */
  create_time: string
  /** 更新时间 */
  update_time: string
  /** 是否删除标记 */
  is_delete: boolean
  /** 仓库地址 */
  storage_address: string | null
  /** 仓库类型 */
  storage_type: string | null
  /** 仓库描述 */
  storage_description: string | null
}

/**
 * 仓库位置接口
 * 用于在其他组件中引用仓库位置信息
 */
export interface StorageLocation {
  /** ID (可选) */
  id?: number
  /** 仓库地址 */
  storage_address: string
  /** 仓库描述 */
  storage_description: string
  /** 仓库类型 */
  storage_type: string
  /** 仓库编码 */
  storage_code: string
  /** 仓库名称 */
  storage_name: string
}

// ==================== 查询参数接口 ====================

/**
 * 仓库查询参数接口
 * 用于仓库列表查询时的筛选条件
 */
export interface StorageQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 仓库编码 */
  storage_code?: string
  /** 仓库名称 */
  storage_name?: string
  /** 仓库类型 */
  storage_type?: string
  /** 仓库描述 */
  storage_description?: string
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意 string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 仓库列表响应接口
 */
export interface StorageResponse {
  /** 总记录数 */
  count: number
  /** 下一页链接 */
  next: string | null
  /** 上一页链接 */
  previous: string | null
  /** 仓库列表数据 */
  results: Storage[]
}

/**
 * 仓库简化接口
 * 用于在组件间引用
 */
export interface StorageItem {
  value: string
  storage_name: string
  storage_code: string
  storage_address: string
}

// ==================== 兼容性接口（保留原有的兼容性定义以兼容现有代码） ====================

// 兼容性别名
// export interface StorageListResponse extends StorageResponse {}

// 统计接口（保留原有的兼容性定义）
export interface StorageStats {
  total_storages: number
  by_type: Record<string, number>
  asset_count_by_storage: Record<string, number>
}
