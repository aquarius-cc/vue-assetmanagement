/**
 * 出库资产批量导入配置（自 OutAssetBatchImport.vue 物理提取，零逻辑变更）
 */
import type { OutAssetCreateForm } from '@/types/outasset'
import { OutAssetType, OutAssetCurrentStatus } from '@/types/outasset'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import type { OutAssetExcelRow } from '@/types/batch-import'
import type { HeaderExample, ExampleColumn } from '@/utils/batchImportHelpers'

// ===== 批量导入配置 =====
export const outAssetImportConfig: BatchImportConfig<OutAssetExcelRow, OutAssetCreateForm> = {
  entityName: '出库资产',

  // Excel 表头中文 -> 数据字段映射
  excelHeaderMap: {
    出库资产编码: 'outasset_code',
    出库数量: 'outasset_number',
    // [HR-01] 后端 v1.1.0 改为 read_only，移除 申请人工号 -> outasset_applicant_jobcode 映射
    // [HR-01] 后端 v1.1.0 改为 read_only，移除 保管人工号 -> outasset_manager_jobcode 映射
    资产状态: 'outasset_current_status',
    出库日期: 'outasset_date',
    预计返回日期: 'return_date',
    出库类型: 'outasset_type',
    // [HR-01] 后端 v1.1.0 改为 read_only，移除 使用位置 -> outasset_using_location 映射
    资产描述: 'outasset_description',
    // 以下辅助字段仅用于展示，不映射到创建表单
    资产名称: 'outasset_name',
    申请人姓名: 'outasset_applicant_name',
    保管人姓名: 'outasset_manager_name',
    所属仓库: 'outasset_storage',
  },

  // 必填字段
  requiredFields: [
    'outasset_code',
    'outasset_number',
    // [HR-01] 后端 v1.1.0 改为 read_only，移除 outasset_applicant_jobcode 必填校验
    // [HR-01] 后端 v1.1.0 改为 read_only，移除 outasset_manager_jobcode 必填校验
    'outasset_date',
  ],

  // 单条数据验证
  validateItem: (item: OutAssetExcelRow) => {
    const errors: Record<string, string> = {}

    // 出库资产编码校验
    if (!item.outasset_code?.trim()) {
      errors.outasset_code = '出库资产编码不能为空'
    }

    // 出库数量校验
    const quantity = Number(item.outasset_number)
    if (isNaN(quantity) || !Number.isInteger(quantity) || quantity < 1) {
      errors.outasset_number = '出库数量必须是正整数'
    }

    // [HR-01] 后端 v1.1.0 改为 read_only，移除申请人工号校验
    // [HR-01] 后端 v1.1.0 改为 read_only，移除保管人工号校验

    // 出库日期校验
    const dateValue = item.outasset_date?.trim()
    if (!dateValue) {
      errors.outasset_date = '出库日期不能为空'
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      errors.outasset_date = '出库日期格式应为 YYYY-MM-DD'
    }

    // 可选字段校验（如果有值）
    const validStatuses = Object.values(OutAssetCurrentStatus)
    if (item.outasset_current_status && !validStatuses.includes(item.outasset_current_status as OutAssetCurrentStatus)) {
      errors.outasset_current_status = `资产状态非法，可选：${validStatuses.join(' / ')}`
    }

    const validTypes = Object.values(OutAssetType)
    if (item.outasset_type && !validTypes.includes(item.outasset_type as OutAssetType)) {
      errors.outasset_type = `出库类型非法，可选：${validTypes.join(' / ')}`
    }

    if (item.return_date && !/^\d{4}-\d{2}-\d{2}$/.test(item.return_date.trim())) {
      errors.return_date = '预计返回日期格式应为 YYYY-MM-DD'
    }

    return { valid: Object.keys(errors).length === 0, errors }
  },

  // Excel 行 → API 提交数据
  transformToApiData: (row: OutAssetExcelRow): OutAssetCreateForm => ({
    outasset_code: row.outasset_code.trim(),
    outasset_number: Number(row.outasset_number),
    // [HR-01] 后端 v1.1.0 改为 read_only，移除 outasset_applicant_jobcode
    // [HR-01] 后端 v1.1.0 改为 read_only，移除 outasset_manager_jobcode
    outasset_date: row.outasset_date.trim(),
    return_date: row.return_date?.trim() || '', // 改为空字符串
    outasset_type: row.outasset_type?.trim() || OutAssetType.RECEIVE,
    // [HR-01] 后端 v1.1.0 改为 read_only，移除 outasset_using_location
    outasset_description: row.outasset_description?.trim() || '', // 改为空字符串
  }),

  // placeholder: 实际提交逻辑在 handleSubmit 中直接调用 batchCreateOutAssets
  createFn: async () => ({}) as OutAssetCreateForm,
  idField: 'outasset_code',
}

// ===== 导入格式参考卡片数据 =====
export const outAssetHeaderExamples: HeaderExample[] = [
  {
    headerName: '出库资产编码',
    field: 'outasset_code',
    required: true,
    example: 'OUT-001',
    remark: '唯一编码',
  },
  {
    headerName: '出库数量',
    field: 'outasset_number',
    required: true,
    example: '1',
    remark: '正整数',
  },
  // [HR-01] 后端 v1.1.0 改为 read_only，移除申请人工号表头说明
  // [HR-01] 后端 v1.1.0 改为 read_only，移除保管人工号表头说明
  {
    headerName: '资产状态',
    field: 'outasset_status',
    required: false,
    example: 'in_use',
    remark: 'in_use/returned/lost/damaged',
  },
  {
    headerName: '出库日期',
    field: 'outasset_date',
    required: true,
    example: '2025-06-01',
    remark: 'YYYY-MM-DD',
  },
  {
    headerName: '预计返回日期',
    field: 'return_date',
    required: false,
    example: '2025-12-31',
    remark: 'YYYY-MM-DD，可选',
  },
  {
    headerName: '出库类型',
    field: 'outasset_type',
    required: false,
    example: 'receive',
    remark: 'receive/borrow/reissue',
  },
  // [HR-01] 后端 v1.1.0 改为 read_only，移除使用位置表头说明
  {
    headerName: '资产描述',
    field: 'outasset_description',
    required: false,
    example: '用于项目测试',
    remark: '非必填',
  },
]

export const outAssetExampleColumns: ExampleColumn[] = [
  { prop: 'outasset_code', label: '出库资产编码' },
  { prop: 'outasset_number', label: '出库数量' },
  // [HR-01] 后端 v1.1.0 改为 read_only，移除申请人工号列
  // [HR-01] 后端 v1.1.0 改为 read_only，移除保管人工号列
  { prop: 'outasset_date', label: '出库日期' },
  { prop: 'outasset_status', label: '资产状态' },
  { prop: 'outasset_type', label: '出库类型' },
  // [HR-01] 后端 v1.1.0 改为 read_only，移除使用位置列
  { prop: 'outasset_description', label: '资产描述' },
]

export const outAssetExampleRows = [
  {
    outasset_code: 'OUT-001',
    outasset_number: 1,
    // [HR-01] 后端 v1.1.0 改为 read_only，移除申请人工号
    // [HR-01] 后端 v1.1.0 改为 read_only，移除保管人工号
    outasset_date: '2025-06-01',
    outasset_status: 'in_use',
    outasset_type: 'receive',
    // [HR-01] 后端 v1.1.0 改为 read_only，移除使用位置
    outasset_description: '用于项目测试',
  },
  {
    outasset_code: 'OUT-002',
    outasset_number: 2,
    // [HR-01] 后端 v1.1.0 改为 read_only，移除申请人工号
    // [HR-01] 后端 v1.1.0 改为 read_only，移除保管人工号
    outasset_date: '2025-05-15',
    outasset_status: 'in_use',
    outasset_type: 'borrow',
    // [HR-01] 后端 v1.1.0 改为 read_only，移除使用位置
    outasset_description: '临时调拨',
  },
]
