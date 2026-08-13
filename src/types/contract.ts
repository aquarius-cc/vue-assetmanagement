/**
 * @file 合同数据模型定义，包括合同类型、结算状态、表单、详情等类型
 * @module types/contract
 * @exports
 *   - ContractType: 合同类型枚举
 *   - ContractStatus: 合同状态枚举
 *   - ContractCreateForm/ContractUpdateForm: 合同表单接口
 *   - Contract: 合同基础接口
 *   - PaymentRecord/PaidRecord: 支付记录接口
 *   - ContractQueryParams: 合同查询参数
 *   - ContractListResponse/ContractListResponseOld: 合同列表响应接口
 *   - ContractTableData: 合同表格数据接口
 *   - ContractStats: 合同统计接口
 *   - ExcelContractData/ValidatedContractData: Excel导入导出接口
 * @callers
 *   - stores/contractStore（合同状态管理）
 *   - utils/Format（格式化工具）
 *   - components/*（组件）
 */

// ==================== 枚举类型定义 ====================

/**
 * 合同类型枚举
 * tender_procurement", "招标采购合同,
 * service", "服务合同,
 * information_construction", "信息化建设合同,
 * direct_procurement", "直接采购合同
 */
export enum ContractType {
  TENDER_PROCUREMENT = 'tender_procurement',
  SERVICE = 'service',
  INFORMATION_CONSTRUCTION = 'information_construction',
  DIRECT_PROCUREMENT = 'direct_procurement',
}

/**
 * 合同状态枚举（对应后端 ContractStatus）
 */
export enum ContractStatus {
  PURCHASING = 'purchasing',
  PURCHASE_FINISHED = 'purchase_finished',
  RECEIVE_CHECK = 'receive_check',
  INITIAL_CHECK = 'initial_check',
  PROJECT_SETTLEMENT = 'project_settlement',
  SETTLEMENT_DONE = 'settlement_done',
  FINAL_CHECK = 'final_check',
  PROJECT_FINISHED = 'project_finished',
}

/**
 * 合同结算状态枚举（保留向后兼容）
 */
export const ContractSettlementStatus = {
  PENDING: 'pending',
  SETTLING_UP: 'settling_up',
  SETTLED: 'settled',
} as const

export type ContractSettlementStatus =
  (typeof ContractSettlementStatus)[keyof typeof ContractSettlementStatus]

/**
 * 支付记录接口
 * 对应后端 ContractPaymentService.add_payment() 返回的单条支付记录
 */
export interface PaymentRecord {
  id: string
  date: string
  amount: number
  description: string
  payment_method: string | null
  operator: string
  status: 'pending' | 'approved' | 'deleted'
  created_at: string
  deleted_at?: string
  deleted_by?: string
  approved_by?: string
  approved_at?: string
}

/**
 * 支付记录汇总结构
 * 对应后端 ContractPaymentService.get_paid_record() 返回的 JSON 结构
 */
export interface PaidRecord {
  payments: PaymentRecord[]
  total_paid: number
  last_payment_date: string | null
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
  /** 合同金额（对应后端 contract_amount） */
  contract_amount: number | string
  /** 供应商名称（对应后端 supplier_name） */
  supplier_name: string
  /** 合同开始日期（对应后端 contract_start_date） */
  contract_start_date: string | null
  /** 合同类型 (可选) */
  contract_type?: ContractType | string | null
  /** 保修期(年) (可选) */
  contract_warranty_period?: number | null
  /** 初验日期 (可选) */
  initial_check_date?: string | null
  /** 终验日期 (可选) */
  final_check_date?: string | null
  /** 合同状态 (可选) */
  contract_status?: ContractStatus | string | null
  /** 结算金额（对应后端 settlemented_price） */
  settlemented_price?: number | string | null
  /** 付款记录（对应后端 paid_record） */
  paid_record?: PaidRecord | string | null
  /** 已支付金额（对应后端 amount_paid） */
  amount_paid?: number | string
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
 * 对应后端数据库表 am_contract 的字段
 */
export interface Contract extends ContractCreateForm {
  /** 主键 ID */
  recordcode: string
  /** 合同结束日期 */
  contract_end_date: string | null
  /** 合同状态 */
  contract_status: ContractStatus | string | null
  /** 到货验收日期 */
  receive_check_date: string | null
  /** 初步验收日期 */
  initial_check_date: string | null
  /** 最终验收日期 */
  final_check_date: string | null
  /** 项目变更标记 */
  project_change: boolean
  /** 变更类型 */
  project_change_type: string | null
  /** 变更描述 */
  project_change_description: string | null
  /** 结算金额 */
  settlemented_price: number | string | null
  /** 已支付金额 */
  amount_paid: number | string
  /** 未支付金额 */
  amount_unpaid: number | string
  /** 是否有支付记录 */
  has_payment: boolean
  /** 合同描述 */
  contract_description: string | null
  /** 排序 */
  sort_order: number
  /** 版本号（乐观锁） */
  version: number
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
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
  /** 供应商名称 */
  supplier_name?: string
  /** 合同状态 */
  contract_status?: ContractStatus | string | null
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
 */
export type ContractTableData = Contract

/**
 * 合同简化接口
 * 用于在组件间引用
 */

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
  supplier_name: string
  /** 合同价格 */
  contract_amount: number
  /** 合同签订日期 */
  contract_start_date: string | null
  /** 合同类型 */
  contract_type: string
  /** 保修期 */
  contract_warranty_period: number
  /** 初验日期 */
  initial_check_date: string | null
  /** 终验日期 */
  final_check_date: string | null
  /** 结算状态 */
  contract_status: ContractStatus | string | null
  /** 结算价格 */
  settlemented_price: number
  /** 已支付金额 */
  amount_paid: number
  /** 已付记录 */
  paid_record: string
  /** 验证状态 */
  validationStatus: 'success' | 'error'
  /** 验证错误信息 */
  validationError: string
}

// ==================== 兼容性接口（保留原有的兼容性定义以兼容现有代码） ====================

export interface ContractListResponseOld {
  success: boolean
  count: number
  next: string | null
  previous: string | null
  results: Contract[]
}
