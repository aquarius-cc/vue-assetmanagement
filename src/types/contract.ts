/**
 * 合同数据模型
 * 对应后端数据库表: am_contract
 */

// ==================== 枚举类型定义 ====================

/**
 * 合同类型枚举
 * purchase: 采购合同
 * service: 服务合同
 * information_construction: 信息化建设合同
 * direct_procurement: 直接采购合同
 */
export enum ContractType {
  PURCHASE = 'purchase',
  SERVICE = 'service',
  INFORMATION_CONSTRUCTION = 'information_construction',
  DIRECT_PROCUREMENT = 'direct_procurement'
}

/**
 * 合同结算状态枚举
 * pending: 待结算
 * settled: 已结算
 */
export enum ContractSettlementStatus {
  PENDING = 'pending',
  SETTLED = 'settled'
}

// ==================== 基础接口定义 ====================

/**
 * 合同创建表单接口
 * 用于创建新合同时的表单数据
 */
export interface ContractCreateForm {
  /** 合同编码 (唯一标识) */
  contract_code: string
  /** 合同名称 */
  contract_name: string
  /** 合同金额 */
  contract_price: number | string
  /** 合同供应商 */
  contract_supplier: string
  /** 合同签订日期 */
  contract_signing_date: string | null
  /** 合同类型 (可选) */
  contract_type?: ContractType | string | null
  /** 保修期(年) (可选) */
  contract_warranty_period?: number | null
  /** 初验日期 (可选) */
  contract_preliminary_acceptance_date?: string | null
  /** 终验日期 (可选) */
  contract_final_acceptance_date?: string | null
  /** 结算状态 (可选) */
  contract_settledment_status: ContractSettlementStatus | null
  /** 结算金额 (可选) */
  contract_settledment_price?: number | string | null
  /** 已付次数 (可选) */
  contract_paid_count_number?: number | string | null
  /** 已付金额 (可选) */
  contract_paid_price?: number | string | null
  /** 付款记录 (可选) */
  contract_paid_record?: string | null
}

/**
 * 合同更新表单接口
 * 用于更新合同信息时的表单数据
 */
export interface ContractUpdateForm extends Partial<ContractCreateForm> {
  /** 合同编码 (唯一标识，用于定位要更新的记录) */
  contract_code: string
}

/**
 * 合同基础接口
 * 对应后端数据库表 am_contract 的基础字段
 */
export interface Contract extends ContractCreateForm {
  /** 主键 ID */
  recordcode: string
  /** 创建时间 */
  create_time: string
  /** 更新时间 */
  updated_at: string
  /** 是否删除标记 */
  is_delete: boolean
  /** 合同类型 */
  contract_type: string | null
  /** 保修期(年) */
  contract_warranty_period: number | null
  /** 初验日期 */
  contract_preliminary_acceptance_date: string | null
  /** 终验日期 */
  contract_final_acceptance_date: string | null
  /** 结算状态 */
  contract_settledment_status: ContractSettlementStatus | null
  /** 结算金额 */
  contract_settledment_price: number | string | null
  /** 已付次数 */
  contract_paid_count_number: number | string | null
  /** 已付金额 */
  contract_paid_price: number | string | null
  /** 付款记录 */
  contract_paid_record: string | null
}

/**
 * 合同简化接口
 * 用于在资产关联中引用
 */
export interface ContractSimplified {
  /** 合同编码 */
  contract_code: string
  /** 合同名称 */
  contract_name: string
  /** 合同金额 */
  contract_price: number
  /** 结算状态 */
  contract_settledment_status: ContractSettlementStatus | null
  /** 合同签订日期 */
  contract_signing_date: string | Date
  /** 合同供应商 */
  contract_supplier: string
  /** 合同类型 */
  contract_type: string
}

// ==================== 查询参数接口 ====================

/**
 * 合同查询参数接口
 * 用于合同列表查询时的筛选条件
 */
export interface ContractQueryParams {
  /** 页码 */
  page?: number
  /** 每页数量 */
  page_size?: number
  /** 搜索关键词 */
  search?: string
  /** 合同编码 */
  contract_code?: string
  /** 合同名称 */
  contract_name?: string
  /** 合同类型 */
  contract_type?: string
  /** 合同供应商 */
  contract_supplier?: string
  /** 结算状态 */
  contract_settledment_status?: ContractSettlementStatus | null
  /** 排序字段 */
  ordering?: string
  /** 索引签名：允许任意 string key，但值必须是 string/number/boolean/null/undefined */
  [key: string]: string | number | boolean | null | undefined
}

// ==================== 响应接口 ====================

/**
 * 合同列表响应接口
 */
export interface ContractListResponse {
  /** 总记录数 */
  count: number
  /** 下一页链接 */
  next: string | null
  /** 上一页链接 */
  previous: string | null
  /** 合同列表数据 */
  results: Contract[]
}

/**
 * 创建用于表格显示的Contract类型
 * 日期字段为string类型
 */
export interface ContractForTable extends Omit<
  Contract,
  'contract_signing_date' | 'contract_preliminary_acceptance_date' | 'contract_final_acceptance_date'
> {
  contract_signing_date: string | null
  contract_preliminary_acceptance_date: string | null
  contract_final_acceptance_date: string | null
}

/**
 * 合同简化接口
 * 用于在组件间引用
 */
export interface ContractItem {
  value: string
  contract_name: string
  contract_code: string
}

// ==================== 统计接口 ====================

/**
 * 合同统计接口
 */
export interface ContractStats {
  /** 总合同数 */
  total_contracts: number
  /** 总金额 */
  total_amount: number
  /** 平均金额 */
  avg_amount: number
  /** 按类型统计 */
  by_type: Record<string, number>
  /** 按状态统计 */
  by_status: Record<string, number>
}

// ==================== Excel 导入导出接口 ====================

/**
 * Excel数据接口
 * 用于从Excel导入合同数据
 */
export interface ExcelContractData {
  /** 合同编码 */
  合同编码: string
  /** 合同名称 */
  合同名称: string
  /** 供应商 */
  供应商: string
  /** 合同价格 */
  合同价格: number | string
  /** 签订日期 */
  签订日期: string
  /** 合同类型 */
  合同类型: string
  /** 保修期 */
  保修期: number | string
  /** 初验日期 */
  初验日期: string | null
  /** 终验日期 */
  终验日期: string | null
  /** 结算状态 */
  结算状态: string
  /** 结算价格 */
  结算价格: number | string
  /** 已付款次数 */
  已付款次数: number | string
  /** 已支付金额 */
  已支付金额: number | string
  /** 已支付记录 */
  已支付记录: string
}

/**
 * 验证后的合同数据接口
 */
export interface ValidatedContractData {
  /** 合同编码 */
  contract_code: string
  /** 合同名称 */
  contract_name: string
  /** 供应商 */
  contract_supplier: string
  /** 合同价格 */
  contract_price: number
  /** 合同签订日期 */
  contract_signing_date: string | null
  /** 合同类型 */
  contract_type: string
  /** 保修期 */
  contract_warranty_period: number
  /** 初验日期 */
  contract_preliminary_acceptance_date: string | null
  /** 终验日期 */
  contract_final_acceptance_date: string | null
  /** 结算状态 */
  contract_settledment_status: ContractSettlementStatus | null
  /** 结算价格 */
  contract_settledment_price: number
  /** 已付次数 */
  contract_paid_count_number: number
  /** 已付金额 */
  contract_paid_price: number
  /** 已付记录 */
  contract_paid_record: string
  /** 验证状态 */
  validationStatus: 'success' | 'error'
  /** 验证错误信息 */
  validationError: string
}

// ==================== 兼容性接口（保留原有的兼容性定义以兼容现有代码） ====================

// 兼容性别名
// export interface ContractForm extends ContractCreateForm {}

export interface ContractListResponseOld {
  success: boolean
  count: number
  next: string | null
  previous: string | null
  results: Contract[]
}
