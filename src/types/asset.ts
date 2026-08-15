/**
 * @file 资产数据模型定义，包括资产状态枚举、表单、详情等类型
 * @module types/asset
 * @exports
 *   - AssetCurrentStatus: 资产状态枚举
 *   - ASSET_STATUS_DISPLAY_MAPPING: 资产状态中文映射
 *   - AssetCreateForm/AssetCreateFormExtended/AssetUpdateForm: 资产表单接口
 *   - AssetSimpleReturn/Asset/AssetDetail/AssetListItem: 资产数据接口
 *   - AssetQueryParams: 资产查询参数
 *   - AssetListResponse/AssetListSimpleResponse: 资产列表响应
 *   - AssetStatistics: 资产统计接口
 *   - AssetImportForm/ValidatedAssetImportData: 业务表单接口
 * @callers
 *   - stores/assetStore（资产状态管理）
 *   - composables/*（组合式函数）
 *   - components/*（组件）
 */

import type { AssetType } from '@/types/assettype'
import type { EmployeeExtended } from '@/types/user'
import type { Contract } from '@/types/contract'
import type { Storage } from '@/types/storage'
import type { HardDiskSN } from '@/types/harddisksn'

// ==================== 枚举类型定义 ====================

/**
 * 资产状态枚举
 * 与后端 ASSET_STATUS_CHOICES 一致
 *
 * 状态流转：
 * - in_store → in_use: 新资产出库
 * - in_use → recycled_pending: 资产回收
 * - recycled_pending → in_use: 回收资产重新发放
 * - in_use → damaged: 提交报废申请
 * - damaged → scrapped: 审批通过，完成报废
 * - damaged → original_status: 审批拒绝，回退申请前状态
 * - repairing → recycled_pending: 维修完成，转入待发放
 * - lost → recycled_pending: 遗失资产找回，转入待发放
 */
export enum AssetCurrentStatus {
  IN_STORE = 'in_store',
  RECYCLED_PENDING = 'recycled_pending',
  IN_USE = 'in_use',
  BROKEN = 'broken',
  REPAIRING = 'repairing',
  LOST = 'lost',
  DAMAGED = 'damaged',
  SCRAPPED = 'scrapped',
}

/** 资产状态中文显示映射 */
export const ASSET_STATUS_DISPLAY_MAPPING: Record<string, string> = {
  in_store: '在库',
  recycled_pending: '已回收待发放',
  in_use: '在用',
  broken: '已损坏',
  repairing: '维修中',
  lost: '已遗失',
  damaged: '待报废',
  scrapped: '已报废',
}

// ==================== 基础接口定义 ====================

/**
 * 资产创建表单接口
 * 与后端创建接口请求参数一致
 *
 * 后端规则变更说明（2024年XX月）：
 * - asset_code 由后端自动生成，前端无需传递
 * - 当 asset_purchase_number > 1 时，后端创建多条 Asset 记录并返回 List[AssetDetail]
 * - 同一批次的编码共享相同的随机字符串，序号连续递增
 *
 * 必填: asset_name, asset_purchase_price, asset_entry_date, asset_type_code
 * 可选: asset_code（新增时后端自动生成，编辑时需传递）, asset_contract_code, asset_storage_code 等
 */
export interface AssetCreateForm {
  /** 资产编码（新增时后端自动生成，编辑时作为唯一标识） */
  asset_code?: string
  /** 资产名称（必填） */
  asset_name: string
  /** 资产购买价格 */
  asset_purchase_price: number | string
  /** 购买日期 */
  asset_purchase_date?: string | null
  /** 入库日期 */
  asset_entry_date?: string | null
  /** 资产类型编码（FK→AssetType.recordcode，必填） */
  asset_type: string
  /** 合同编码（FK→Contract.recordcode，可选） */
  asset_contract?: string | null
  /** 仓库编码（FK→Storage.recordcode，可选） */
  asset_storage?: string | null
  /** 入库人工号（FK→Employee.employee_jobcode，可选） */
  asset_entry_person?: string | null
  /** 申请人工号（FK→Employee.employee_jobcode，可选） */
  asset_applicant?: string | null
  /** 管理人工号（FK→Employee.employee_jobcode，可选） */
  asset_manager?: string | null
  /** 资产品牌（可选） */
  asset_brand?: string | null
  /** 资产规格（可选） */
  asset_specification?: string | null
  /** 资产单位（可选） */
  asset_unit?: string | null
  /** 资产购买数量（默认1） */
  asset_purchase_number?: number
  /** 保修期（年，默认0） */
  asset_warranty_period?: number | null
  /** 资产描述（可选） */
  asset_description?: string | null
  /** 资产使用地点（可选） */
  asset_using_location?: string | null
}

/**
 * 资产表单扩展接口（表单页面使用）
 * 在 AssetCreateForm 基础上增加关联对象的显示名称字段
 */
export interface AssetCreateFormExtended extends AssetCreateForm {
  /** 资产类型名称（显示用，下拉选择用） */
  asset_type_name?: string
  /** 合同名称（显示用，autocomplete） */
  asset_contract_name?: string
  /** 仓库名称（显示用，select） */
  asset_storage_name?: string
  /** 入库人姓名（显示用，autocomplete） */
  asset_entry_person_name?: string
  /** 申请人姓名（显示用） */
  asset_applicant_name?: string
  /** 管理人姓名（显示用） */
  asset_manager_name?: string
  /** 资产当前状态（编辑模式显示用） */
  asset_current_status?: AssetCurrentStatus | string
}

/**
 * 资产更新表单接口
 * 编辑时必须传递 asset_code 作为唯一标识
 */
export interface AssetUpdateForm extends Partial<Omit<AssetCreateForm, 'asset_code'>> {
  /** 资产编码（唯一标识，编辑时必须传递） */
  asset_code: string
}

/**
 * 资产简单返回接口
 * 包含资产编码、名称、记录编码、购买价格、购买数量
 */
export interface AssetSimpleReturn {
  asset_code: string
  asset_brand: string | null
  asset_unit: string | null
  asset_name: string
  recordcode: string
  asset_purchase_number: number
  asset_applicant_jobcode: string | null
  asset_contract_code: string | null
  asset_current_status: AssetCurrentStatus | string
  asset_description: string | null
  asset_entry_date: string | null
  asset_entry_person_jobcode: string | null
  asset_manager_jobcode: string | null
  asset_purchase_date: string | null
  asset_purchase_price: string
  asset_specification: string | null
  asset_storage_code: string | null
  asset_type_code: string
  asset_using_location: string | null
  asset_warranty_period: number | null
  is_active: boolean
  return_asset_category: string
  return_asset_type_code: string
  return_asset_type_name: string
  return_contract_code: string | null
  return_contract_name: string | null
  return_storage_code: string | null
  return_storage_name: string | null
}

/**
 * 资产基础接口
 * 对应后端数据库表 am_asset 的字段
 */
export interface Asset {
  /** 资产编码（全局唯一，最大20字符） */
  asset_code: string
  /** 资产名称 */
  asset_name: string
  /** 记录编码（系统自动生成） */
  recordcode: string
  /** 资产购买价格 */
  asset_purchase_price: string
  /** 资产购买数量 */
  asset_purchase_number: number
  /** 资产单位 */
  asset_unit: string | null
  /** 资产品牌 */
  asset_brand: string | null
  /** 资产规格 */
  asset_specification: string | null
  /** 资产类型编码（外键） */
  asset_type_code: string
  /** 合同编码（外键） */
  asset_contract_code: string | null
  /** 购买日期 */
  asset_purchase_date: string
  /** 保修期（年） */
  asset_warranty_period: number | null
  /** 入库日期 */
  asset_entry_date: string
  /** 仓库编码（外键） */
  asset_storage_code: string | null
  /** 资产使用地点 */
  asset_using_location: string | null
  /** 入库人工号（外键） */
  asset_entry_person_jobcode: string | null
  /** 申请人工号（外键） */
  asset_applicant_jobcode: string | null
  /** 管理人工号（外键） */
  asset_manager_jobcode: string | null
  /** 资产当前状态 */
  asset_current_status: AssetCurrentStatus
  /** 资产描述 */
  asset_description: string | null
}

/**
 * 资产详情接口
 * 包含关联对象的完整数据（API 返回的嵌套结构）
 */
export interface AssetDetail extends Asset {
  /** 资产类型完整信息（外键关联对象） */
  asset_type?: AssetType
  /** 关联合同完整信息（外键关联对象） */
  asset_contract?: Contract
  /** 存储仓库完整信息（外键关联对象） */
  asset_storage?: Storage
  /** 入库人完整信息（外键关联对象） */
  asset_entry_person?: EmployeeExtended
  /** 申请人完整信息（外键关联对象） */
  asset_applicant?: EmployeeExtended
  /** 管理人完整信息（外键关联对象） */
  asset_manager?: EmployeeExtended
  /** 关联硬盘序列号列表 */
  harddisk_sns: HardDiskSN[]
}

/**
 * 资产列表项（包含关联对象名称，用于列表展示）
 */
export interface AssetListItem extends Asset {
  /** 资产类型名称 */
  asset_type_name?: string
  /** 仓库名称 */
  asset_storage_name?: string
  /** 合同名称 */
  asset_contract_name?: string
  /** 申请人姓名 */
  asset_applicant_name?: string
  /** 管理人姓名 */
  asset_manager_name?: string
}

// ==================== 查询参数接口 ====================

/**
 * 资产查询参数接口
 * 与后端列表接口查询参数一致
 */
export interface AssetQueryParams {
  /** 页码 */
  page?: number
  /** 每页条数 */
  page_size?: number
  /** 资产状态 (in_store/in_use/damaged/scrapped) */
  asset_current_status?: string
  /** 资产类型编码 */
  asset_type?: string
  /** 仓库编码 */
  asset_storage?: string
  /** 搜索关键词（编码/名称/品牌/规格） */
  keyword?: string
  /** 排序字段，默认 -asset_entry_date */
  ordering?: string
  /** 索引签名 */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 资产列表响应接口
 */
export interface AssetListResponse {
  /** 总记录数 */
  count: number
  /** 下一页链接 */
  next: string | null
  /** 上一页链接 */
  previous: string | null
  /** 资产列表数据 */
  results: AssetDetail[]
}

export interface AssetListSimpleResponse {
  /** 总记录数 */
  count: number
  /** 下一页链接 */
  next: string | null
  /** 上一页链接 */
  previous: string | null
  /** 资产列表数据 */
  results: AssetSimpleReturn[]
}

/**
 * 资产统计接口
 */
export interface AssetStatistics {
  /** 总数 */
  total: number
  /** 按状态统计 */
  byStatus: Record<string, number>
  /** 按类型统计 */
  byType: Record<string, number>
  /** 按仓库统计 */
  byStorage: Record<string, number>
  /** 最近新增数 */
  recentAdded: number
}

/**
 * 资产简化接口
 * 用于在组件间引用
 */

// ==================== 业务操作表单接口 ====================

// ==================== Excel 导入导出接口 ====================

/**
 * Excel 导入数据接口
 * 对应 AssetContentDetails.vue 导出的列名
 */
export interface AssetImportForm {
  /** 编码 */
  编码: string
  /** 名称 */
  名称: string
  /** 型号规格 */
  型号规格: string
  /** 品牌 */
  品牌: string
  /** 单位 */
  单位: string
  /** 单价 */
  单价: string | number
  /** 采购数量 */
  采购数量: string | number
  /** 采购日期 */
  采购日期: string | null
  /** 质保期(年) */
  '质保期(年)': string | number
  /** 录入日期 */
  录入日期: string
  /** 新旧状态 */
  新旧状态: string
  /** 资产使用状态 */
  资产使用状态: string
  /** 当前状态 */
  当前状态: string
  /** 资产分类 */
  资产分类: string
  /** 分类类型 */
  分类类型: string
  /** 录入人工号 */
  录入人工号: string
  /** 合同编码 */
  合同编码: string
  /** 合同名称 */
  合同名称: string
  /** 资产申请人工号 */
  资产申请人工号: string | null
  /** 资产管理员工号 */
  资产管理员工号: string | null
  /** 使用地点 */
  使用地点: string | null
  /** 仓库名称 */
  仓库名称: string
  /** 仓库编码 */
  仓库编码: string
  /** 资产描述 */
  资产描述: string | undefined
  /** 使用记录 */
  使用记录: string | null
}

/**
 * 验证后的资产导入数据接口
 */
export interface ValidatedAssetImportData extends AssetImportForm {
  /** 验证状态 */
  validationStatus: 'success' | 'error' | 'pending'
  /** 验证错误信息 */
  validationError: string
  /** 验证错误详情 */
  validationErrors: Record<string, string>
}

/**
 * 验证后的资产数据接口
 */
