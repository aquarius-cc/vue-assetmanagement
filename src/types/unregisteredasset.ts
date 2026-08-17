/**
 * @file 未登记资产数据模型定义，包括场景类型、处理类型、审批状态等类型
 * @module types/unregisteredasset
 * @exports
 *   - ScenarioType/HandleType/UnregisteredAssetStatus: 枚举类型
 *   - UnregisteredAssetCreateForm/UnregisteredAssetUpdateForm/UnregisteredAssetApproveForm: 表单接口
 *   - UnregisteredAsset: 未登记资产基础接口
 *   - UnregisteredAssetQueryParams: 查询参数
 *   - UnregisteredAssetListResponse: 列表响应接口
 *   - scenarioTypeTextMap/scenarioTypeTagMap/handleTypeTextMap/unregisteredAssetStatusTextMap/unregisteredAssetStatusTagMap: 中文映射常量
 * @callers
 *   - stores/unregisteredassetStore（未登记资产状态管理）
 *   - composables/*（组合式函数）
 *   - components/*（组件）
 */

import type { PaginatedResponse } from '@/types/common'

/**
 * 未登记资产数据模型
 * 对应后端接口: /unregisteredassets/unregistered-assets/
 * 所有字段名采用 snake_case 与后端保持一致
 */

// ==================== 枚举类型定义 ====================

/**
 * 场景类型枚举
 * s1_no_record: 无记录资产（系统内无任何记录）
 * s2_no_outasset: 无出库记录（有资产记录但无出库记录）
 * s3_status_mismatch: 状态不匹配（资产状态与实际不符）
 */
export enum ScenarioType {
  S1_NO_RECORD = 's1_no_record',
  S2_NO_OUTASSET = 's2_no_outasset',
  S3_STATUS_MISMATCH = 's3_status_mismatch',
}

/**
 * 处理类型枚举
 * create_and_recycle: 新建并回收
 * create_and_damaged: 新建并报废
 * supplement_and_recycle: 补录并回收
 * correct_and_recycle: 纠正并回收
 * reject: 驳回
 */
export enum HandleType {
  CREATE_AND_RECYCLE = 'create_and_recycle',
  CREATE_AND_DAMAGED = 'create_and_damaged',
  SUPPLEMENT_AND_RECYCLE = 'supplement_and_recycle',
  CORRECT_AND_RECYCLE = 'correct_and_recycle',
  REJECT = 'reject',
}

/**
 * 未登记资产审批状态枚举
 * pending: 待审批
 * approved: 已批准
 * rejected: 已拒绝
 */
export enum UnregisteredAssetStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// ==================== 基础接口定义 ====================

/**
 * 未登记资产创建表单接口
 * 用于创建未登记资产时的表单数据
 */
export interface UnregisteredAssetCreateForm {
  /** 场景类型 (s1_no_record/s2_no_outasset/s3_status_mismatch) */
  scenario_type: string
  /** 发现日期 (必填) */
  discovery_date: string
  /** 发现地点 (必填) */
  discovery_location: string
  /** 资产名称 (必填) */
  asset_name: string
  /** 资产品牌 (可选) */
  asset_brand?: string | null
  /** 资产规格型号 (可选) */
  asset_specification?: string | null
  /** 资产类型编码 (可选，业务编码 type_code) */
  unregistered_asset_type?: string | null
  /** 预估价值 (可选) */
  estimated_value?: number | string | null
  /** 关联资产编码 (S2/S3场景必填，业务编码 asset_code) */
  related_asset?: string | null
  /** 目标仓库编码 (可选，业务编码 storage_code) */
  unregistered_asset_storage?: string | null
  /** 处理描述 (可选) */
  handle_description?: string | null
  /** 附件列表 (可选) */
  attachments?: string[] | null
}

/**
 * 未登记资产更新表单接口
 * 用于更新未登记资产信息时的表单数据
 */
export interface UnregisteredAssetUpdateForm extends Partial<UnregisteredAssetCreateForm> {
  /** 未登记资产编码 (用于定位要更新的记录) */
  unregistered_code?: string
}

/**
 * 未登记资产审批表单接口
 * 用于审批未登记资产时的请求数据
 */
export interface UnregisteredAssetApproveForm {
  /** 处理类型 (必填) */
  handle_type: string
  /** 审批备注 (可选) */
  approval_remark?: string | null
}

/** 员工信息（发现人/审批人） */
export interface UnregisteredPersonInfo {
  /** 员工工号 */
  jobcode: string
  /** 员工姓名 */
  name: string
}

/** 关联资产信息（详情返回） */
export interface UnregisteredRelatedAssetInfo {
  /** 资产编码 */
  code: string
  /** 资产名称 */
  name: string
}

/**
 * 未登记资产接口
 * 列表与详情响应的字段并集
 */
export interface UnregisteredAsset {
  /** 主键 ID */
  id: number
  /** 未登记资产编码（唯一标识） */
  unregistered_code: string
  /** 场景类型 */
  scenario_type: string
  /** 发现日期 */
  discovery_date: string
  /** 发现地点 */
  discovery_location: string
  /** 发现人（详情返回对象） */
  discovery_person?: UnregisteredPersonInfo | null
  /** 发现人姓名（列表返回） */
  discovery_person_name?: string | null
  /** 资产名称 */
  asset_name: string
  /** 资产品牌 */
  asset_brand?: string | null
  /** 资产规格型号 */
  asset_specification?: string | null
  /** 资产类型编码（业务编码） */
  unregistered_asset_type?: string | null
  /** 预估价值 */
  estimated_value?: number | string | null
  /** 关联资产（详情返回对象，创建提交时传业务编码字符串） */
  related_asset?: string | UnregisteredRelatedAssetInfo | null
  /** 目标仓库编码（业务编码） */
  unregistered_asset_storage?: string | null
  /** 处理类型 */
  handle_type?: string | null
  /** 处理描述 */
  handle_description?: string | null
  /** 审批状态 */
  approval_status: string
  /** 审批人（对象） */
  approver?: UnregisteredPersonInfo | null
  /** 审批人姓名（列表返回） */
  approver_name?: string | null
  /** 审批备注 */
  approval_remark?: string | null
  /** 审批日期 */
  approval_date?: string | null
  /** 附件列表 */
  attachments?: string[] | null
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

// ==================== 查询参数接口 ====================

/**
 * 未登记资产查询参数接口
 * 用于未登记资产列表查询时的筛选条件
 */
export interface UnregisteredAssetQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 场景类型筛选 */
  scenario_type?: string
  /** 审批状态筛选 */
  approval_status?: string
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意 string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/** 未登记资产列表响应 */
export type UnregisteredAssetListResponse = PaginatedResponse<UnregisteredAsset>

// ==================== 辅助映射 ====================

/**
 * 场景类型中文映射
 */
export const scenarioTypeTextMap: Record<string, string> = {
  [ScenarioType.S1_NO_RECORD]: '无记录资产',
  [ScenarioType.S2_NO_OUTASSET]: '无出库记录',
  [ScenarioType.S3_STATUS_MISMATCH]: '状态不匹配',
}

/**
 * 场景类型标签颜色映射
 */
export const scenarioTypeTagMap: Record<string, string> = {
  [ScenarioType.S1_NO_RECORD]: 'danger',
  [ScenarioType.S2_NO_OUTASSET]: 'warning',
  [ScenarioType.S3_STATUS_MISMATCH]: 'info',
}

/**
 * 处理类型中文映射
 */
export const handleTypeTextMap: Record<string, string> = {
  [HandleType.CREATE_AND_RECYCLE]: '新建并回收',
  [HandleType.CREATE_AND_DAMAGED]: '新建并报废',
  [HandleType.SUPPLEMENT_AND_RECYCLE]: '补录并回收',
  [HandleType.CORRECT_AND_RECYCLE]: '纠正并回收',
  [HandleType.REJECT]: '驳回',
}
