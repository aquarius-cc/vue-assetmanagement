/**
 * 合同批量导入配置（自 ContractBatchImport.vue 物理提取，零逻辑变更）
 */
import type { ContractCreateForm } from '@/types/contract'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import type { ContractExcelRow } from '@/types/batch-import'
import type { HeaderExample, ExampleColumn } from '@/utils/batchImportHelpers'
import {
  requireNonEmpty,
  requireNumber,
  requireDate,
  requireEnum,
  optionalDate,
  optionalNumber,
} from '@/utils/batchImport/validation'

/** 合同类型允许集（validateItem 枚举校验单一来源） */
const CONTRACT_TYPES = [
  'tender_procurement',
  'service',
  'information_construction',
  'direct_procurement',
] as const

/** 合同状态允许集（validateItem 枚举校验单一来源） */
const CONTRACT_STATUSES = [
  'purchasing',
  'purchase_finished',
  'receive_check',
  'initial_check',
  'project_settlement',
  'settlement_done',
  'final_check',
  'project_finished',
] as const

// ===== 批量导入配置 =====
export const contractImportConfig: BatchImportConfig<ContractExcelRow, ContractCreateForm> = {
  entityName: '合同',

  // Excel 表头中文 -> 数据字段映射
  excelHeaderMap: {
    合同编码: 'contract_code',
    合同名称: 'contract_name',
    供应商: 'supplier_name',
    合同金额: 'contract_amount',
    签订日期: 'contract_start_date',
    合同类型: 'contract_type',
    保修期: 'contract_warranty_period',
    初验日期: 'initial_check_date',
    终验日期: 'final_check_date',
    合同状态: 'contract_status',
    结算价格: 'settlemented_price',
    已付金额: 'amount_paid',
  },

  // 必填字段
  requiredFields: [
    'contract_code',
    'contract_name',
    'supplier_name',
    'contract_amount',
    'contract_start_date',
    'contract_type',
    'contract_warranty_period',
    'contract_status',
  ],

  // 单条数据验证（P1-4：同构分支收敛至 batchImport/validation 原语，本体降为纯调用序列）
  validateItem: (item: ContractExcelRow) => {
    const errors: Record<string, string> = {}

    requireNonEmpty(item.contract_code, 'contract_code', '合同编码不能为空', errors)
    requireNonEmpty(item.contract_name, 'contract_name', '合同名称不能为空', errors)
    requireNonEmpty(item.supplier_name, 'supplier_name', '供应商不能为空', errors)
    requireNumber(
      item.contract_amount,
      'contract_amount',
      '合同金额必须是有效数字且不小于0',
      true,
      errors,
    )
    requireDate(
      item.contract_start_date,
      'contract_start_date',
      '签订日期不能为空',
      '签订日期格式应为 YYYY-MM-DD',
      errors,
    )
    requireEnum(
      item.contract_type,
      'contract_type',
      '合同类型不能为空',
      CONTRACT_TYPES,
      '合同类型无效，可选：tender_procurement / service / information_construction / direct_procurement',
      errors,
    )
    requireNumber(
      item.contract_warranty_period,
      'contract_warranty_period',
      '保修期必须是有效数字且不小于0',
      true,
      errors,
    )
    requireEnum(
      item.contract_status,
      'contract_status',
      '合同状态不能为空',
      CONTRACT_STATUSES,
      '合同状态无效，可选：purchasing / purchase_finished / receive_check / initial_check / project_settlement / settlement_done / final_check / project_finished',
      errors,
    )
    optionalDate(
      item.initial_check_date,
      'initial_check_date',
      '初验日期格式应为 YYYY-MM-DD',
      errors,
    )
    optionalDate(item.final_check_date, 'final_check_date', '终验日期格式应为 YYYY-MM-DD', errors)
    optionalNumber(
      item.settlemented_price,
      'settlemented_price',
      '结算价格必须是有效数字且不小于0',
      errors,
    )
    optionalNumber(item.amount_paid, 'amount_paid', '已付金额必须是有效数字且不小于0', errors)

    return { valid: Object.keys(errors).length === 0, errors }
  },

  // Excel 数据转换为 API 提交数据
  transformToApiData: (row: ContractExcelRow): ContractCreateForm => ({
    contract_code: row.contract_code.trim(),
    contract_name: row.contract_name.trim(),
    supplier_name: row.supplier_name.trim(),
    contract_amount: Number(row.contract_amount),
    contract_start_date:
      typeof row.contract_start_date === 'string'
        ? row.contract_start_date.trim()
        : String(row.contract_start_date),
    contract_type: row.contract_type.trim(),
    contract_warranty_period: Number(row.contract_warranty_period),
    initial_check_date:
      typeof row.initial_check_date === 'string'
        ? row.initial_check_date.trim()
        : row.initial_check_date
          ? String(row.initial_check_date)
          : null,
    final_check_date:
      typeof row.final_check_date === 'string'
        ? row.final_check_date.trim()
        : row.final_check_date
          ? String(row.final_check_date)
          : null,
    contract_status: row.contract_status?.trim() || null,
    settlemented_price: row.settlemented_price ? Number(row.settlemented_price) : 0,
    amount_paid: row.amount_paid ? Number(row.amount_paid) : 0,
  }),

  // placeholder: 实际提交逻辑调用 batchCreateContracts 函数
  createFn: async () => ({}) as ContractCreateForm,
  idField: 'contract_code',
}

// ===== 导入格式参考卡片 =====
export const contractHeaderExamples: HeaderExample[] = [
  {
    headerName: '合同编码',
    field: 'contract_code',
    required: true,
    example: 'CT-2025-001',
    remark: '唯一编码',
  },
  {
    headerName: '合同名称',
    field: 'contract_name',
    required: true,
    example: '服务器采购合同',
    remark: '合同全称',
  },
  {
    headerName: '供应商',
    field: 'supplier_name',
    required: true,
    example: 'XX科技有限公司',
    remark: '供应商名称',
  },
  {
    headerName: '合同金额',
    field: 'contract_amount',
    required: true,
    example: '100000',
    remark: '数字，≥0',
  },
  {
    headerName: '签订日期',
    field: 'contract_start_date',
    required: true,
    example: '2025-01-15',
    remark: 'YYYY-MM-DD',
  },
  {
    headerName: '合同类型',
    field: 'contract_type',
    required: true,
    example: 'tender_procurement',
    remark: 'tender_procurement/service/information_construction/direct_procurement',
  },
  {
    headerName: '保修期',
    field: 'contract_warranty_period',
    required: true,
    example: '3',
    remark: '年，数字',
  },
  {
    headerName: '初验日期',
    field: 'initial_check_date',
    required: false,
    example: '2025-02-01',
    remark: 'YYYY-MM-DD，可选',
  },
  {
    headerName: '终验日期',
    field: 'final_check_date',
    required: false,
    example: '2025-06-30',
    remark: 'YYYY-MM-DD，可选',
  },
  {
    headerName: '合同状态',
    field: 'contract_status',
    required: true,
    example: 'purchasing',
    remark:
      'purchasing/purchase_finished/receive_check/initial_check/project_settlement/settlement_done/final_check/project_finished',
  },
  {
    headerName: '结算价格',
    field: 'settlemented_price',
    required: false,
    example: '50000',
    remark: '数字，≥0',
  },
  {
    headerName: '已付金额',
    field: 'amount_paid',
    required: false,
    example: '50000',
    remark: '数字，≥0',
  },
]

export const contractExampleColumns: ExampleColumn[] = contractHeaderExamples.map((h) => ({
  prop: h.field,
  label: h.headerName,
}))

export const contractExampleRows = [
  {
    contract_code: 'CT-2025-001',
    contract_name: '服务器采购合同',
    supplier_name: 'XX科技有限公司',
    contract_amount: 100000,
    contract_start_date: '2025-01-15',
    contract_type: 'tender_procurement',
    contract_warranty_period: 3,
    initial_check_date: '2025-02-01',
    final_check_date: '2025-06-30',
    contract_status: 'purchasing',
    settlemented_price: 50000,
    amount_paid: 50000,
  },
  {
    contract_code: 'CT-2025-002',
    contract_name: '软件服务合同',
    supplier_name: 'YY信息技术有限公司',
    contract_amount: 50000,
    contract_start_date: '2025-02-10',
    contract_type: 'service',
    contract_warranty_period: 1,
    initial_check_date: '',
    final_check_date: '2025-12-31',
    contract_status: 'settlement_done',
    settlemented_price: 50000,
    amount_paid: 50000,
  },
]
