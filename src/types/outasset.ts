/**
 * 出库资产数据模型
 * 对应后端数据库表: am_out_asset
 */

import type { Employee } from '@/types/user'
import type { Contract } from '@/types/contract'

// ==================== 枚举类型定义 ====================

/**
 * 出库类型枚举
 * receive: 领用
 * borrow: 借用
 */
export enum OutAssetType {
  RECEIVE = 'receive',
  BORROW = 'borrow'
}

/**
 * 出库资产状态枚一 * in_use: 在用
 * recycled: 已回攀 */
export enum OutAssetCurrentStatus {
  IN_USE = 'in_use',
  RECYCLED_PENDING = 'recycled_pending',
  DAMAGED = 'damaged',
  SCRAPPED = 'scrapped',
}

/**
 * 出库资产状态枚举文本映尀 */

export const outassetStatusMapping = {
  recycled_pending:'已回收待发放',
  in_use: '在用',
  damaged: '待报废',
  scrapped:'已报废'
}

// ==================== 基础接口定义 ====================

/**
 * 出库资产创建表单接口
 * 用于创建出库资产时的表单数据　 * [HR-02] 后端 v1.2.0 恢复以下字段由前端传递：
 * - outasset_applicant_jobcode（前端通过员工选择器获取）
 * - outasset_manager_jobcode（前端通过员工选择器获取）
 * - outasset_using_location（前端文本输入）
 * - outasset_current_status（后端为 read_only，前端传入无效）
 */
export interface OutAssetCreateForm {
  /** 出库资产编码 (外键关联 am_asset.asset_code, 可退 */
  outasset_code: string | null
  /** 出库数量 */
  outasset_number: number
  /** 出库申请人工号*/
  outasset_applicant_jobcode?: string | null
  /** 出库保管人工号*/
  outasset_manager_jobcode?: string | null
  /** 出库日期 */
  outasset_date: string
  /** 归还日期 (可退 */
  return_date?: string | null
  /** 出库类型 (可退 */
  outasset_type?: OutAssetType | string | null
  /** 出库使用地点 */
  outasset_using_location?: string | null
  /** 出库描述 (可退 */
  outasset_description?: string | null
  /** 关联合同编码 (外键关联 am_contract.contract_code, 可退 */
  outasset_contract_code?: string | null
}

/**
 * 出库资产更新表单接口
 * 用于更新出库资产信息时的表单数据
 */
export interface OutAssetUpdateForm extends Partial<OutAssetCreateForm> {
  /** 后端记录编码 (用于定位要更新的记录) */
  recordcode?: string
  /** 出库记录编码 (向后兼容) */
  outasset_recordcode?: string
}

/**
 * 出库资产基础接口
 * 对应后端数据库表 am_out_asset 的基础字段
 */
export interface OutAsset extends OutAssetCreateForm {
  /** 主键 ID */
  id: number
  /** 后端记录编码 (与后竀recordcode 字段一致，用于 lookup/delete/batchDelete) */
  recordcode: string
  /** 出库记录编码 (向后兼容，同 recordcode) */
  asset_recordcode: string
  /** 出库资产编码 */
  asset_code: string | null
  /** 出库申请人工号*/
  outasset_applicant_jobcode: string | null
  // [HR-01] 后端 v1.1.0 改为 read_only，但 OutAsset 响应接口仍保留此字段（后端仍返回＀  /** 出库保管人工号*/
  outasset_applicant_name?: string
  outasset_manager_name?: string
  outasset_manager_jobcode: string | null
  /** 出库资产状态*/
  outasset_current_status: string | null
  /** 归还日期 */
  return_date: string | null
  /** 出库类型 */
  outasset_type: string | null
  /** 出库描述 */
  outasset_description: string | null
  /** 关联合同编码 */
  outasset_contract_code: string | null
  /** 出库资产规格型号 */
  outasset_specification: string | null
  // [HR-01] 后端 v1.1.0 改为 read_only，但 OutAsset 响应接口仍保留此字段（后端仍返回＀  /** 出库使用地点 */
  outasset_using_location: string | null
}

/**
 * 出库资产详情接口
 * 包含关联对象的完整数捀 */
export interface OutAssetDetail extends OutAsset {
  /** 出库资产名称 */
  asset_name?: string
  /** 出库申请人完整信息(外键关联对象) */
  outasset_applicant?: Employee
  /** 出库申请人工号*/
  applicant_jobcode?: string | null
  /** 出库保管人完整信息(外键关联对象) */
  outasset_manager?: Employee
  /** 出库保管人工号*/
  manager_jobcode?: string | null
  /** 关联合同完整信息 (外键关联对象) */
  contract?: Contract
  /** 出库使用地点 */
  using_location?: string | null
  asset_specification?: string | null
  outasset_name?: string | null
}

/**
 * 可回收出库资产接号 */
export interface RecyclableOutAsset extends OutAsset {
  /** 资产名称（从 outasset_name 改为 asset_name＀*/
  outasset_name: string
  /** 保管人信息（嵌套对象＀*/
  outasset_manager: {
    employee_name: string
    employee_jobcode: string
    employee_department_name?: string
  } | null
  /** 申请人信息（嵌套对象＀*/
  outasset_applicant: {
    employee_name: string
    employee_jobcode: string
  } | null
}
/**
 * 可回收出库资产列表响应接号 */
export interface RecyclableOutAssetResponse {
  /** 总记录数 */
  count: number
  /** 下一页链掀*/
  next: string | null
  /** 上一页链掀*/
  previous: string | null
  /** 可回收出库资产列表数捀*/
  results: RecyclableOutAsset[]
}

/**
 * 员工自动完成项接号 * 用于 el-autocomplete 下拉建议展示
 */
export interface EmployeeAutocompleteItem {
  /** 值（用于输入框显示） */
  value: string
  /** 员工姓名 */
  employee_name: string
  /** 员工工号 */
  employee_jobcode: string
  /** 所属部门名称*/
  employee_department_name?: string
}

/**
 * 出库资产扩展表单接口
 * 仅用于前端表单展示，扩展人outasset_name 和员工姓名字段　 * [HR-02] 后端 v1.2.0 恢复 applicant_name/manager_name 用于前端展示　 */
export interface OutAssetCreateExtended extends OutAssetCreateForm {
  /** 出库资产名称 */
  outasset_name?: string
  /** 出库申请人姓名（前端展示用） */
  outasset_applicant_name?: string
  /** 出库保管人姓名（前端展示用） */
  outasset_manager_name?: string
}

// ==================== 查询参数接口 ====================

/**
 * 出库资产查询参数接口
 * 用于出库资产列表查询时的筛选条什 */
export interface OutAssetQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词（模糊匹配资产编码/名称/规格/品牌＀*/
  search?: string
  /** 搜索类型：asset/user/all */
  searchType?: string
  /** 资产编码（模糊匹配） */
  asset_code?: string
  /** 资产名称（模糊匹配） */
  asset_name?: string
  /** 资产规格（模糊匹配） */
  asset_specification?: string
  /** 资产品牌（模糊匹配） */
  asset_brand?: string
  /** 申请人姓名（模糊匹配＀*/
  outasset_applicant_name?: string
  /** 保管人姓名（模糊匹配＀*/
  outasset_manager_name?: string
  /** 部门名称（模糊匹配） */
  department?: string
  /** 部门编码（精确匹配） */
  department_code?: string
  /** 员工工号（精确匹配） */
  employee_jobcode?: string
  /** 出库时间范围（年＀*/
  years?: number
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任愀string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 出库资产列表响应接口
 */
export interface OutAssetResponse {
  /** 总记录数 */
  count: number
  /** 下一页链掀*/
  next: string | null
  /** 上一页链掀*/
  previous: string | null
  /** 出库资产列表数据 */
  results: OutAssetDetail[]
}

/**
 * 资产自动完成接口
 */
export interface AssetAutocompleteItem {
  /** 候*/
  value: string
  /** 资产名称 */
  asset_name: string
  /** 资产编码 */
  asset_code: string
  /** 资产当前状态*/
  asset_current_status: string
}
