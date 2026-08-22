/**
 * 资产批量导入配置（自 AssetBatchImport.vue 物理提取，零逻辑变更）
 *
 * 后端规则变更说明：
 * - asset_code 由后端自动生成，前端无需传递
 * - asset_purchase_number > 1 时，后端创建多条 Asset 记录
 */
import type { AssetCreateForm } from '@/types/asset'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import type { AssetExcelRow } from '@/types/batch-import'
import type { HeaderExample, ExampleColumn } from '@/utils/batchImportHelpers'

// ===== 批量导入配置（对应AssetCreateForm） =====
export const assetImportConfig: BatchImportConfig<AssetExcelRow, AssetCreateForm> = {
  entityName: '资产',
  // Excel 表头中文 -> 数据字段映射
  excelHeaderMap: {
    资产编码: 'asset_code',
    资产名称: 'asset_name',
    规格型号: 'asset_specification',
    品牌: 'asset_brand',
    单位: 'asset_unit',
    单价: 'asset_purchase_price',
    采购数量: 'asset_purchase_number',
    采购日期: 'asset_purchase_date',
    质保期: 'asset_warranty_period',
    入库日期: 'asset_entry_date',
    当前状态: 'asset_current_status',
    资产分类编码: 'asset_type',
    录入人工: 'asset_entry_person',
    合同编码: 'asset_contract',
    申请人工: 'asset_applicant',
    保管人工: 'asset_manager',
    使用地点: 'asset_using_location',
    仓库编码: 'asset_storage',
    资产描述: 'asset_description',
  },
  // 必填字段（基于 AssetCreateForm 的必需字段）
  // 注意：asset_code 已改为后端自动生成，不再是必填字段）
  requiredFields: [
    'asset_name',
    'asset_specification',
    'asset_purchase_price',
    'asset_purchase_number',
    'asset_entry_date',
    'asset_type',
    'asset_current_status',
  ],
  // 单条数据验证
  validateItem: (item: AssetExcelRow) => {
    const errors: Record<string, string> = {}

    // asset_code 改为可选（后端自动生成），移除必填校验和长度校验    // if (!item.asset_code?.toString().trim()) {
    //   errors.asset_code = '资产编码不能为空'
    // } else if (item.asset_code.length < 3 || item.asset_code.length > 50) {
    //   errors.asset_code = '编码长度 3-50 个字符'
    // }

    if (!item.asset_name?.trim()) {
      errors.asset_name = '资产名称不能为空'
    } else if (item.asset_name.length < 2 || item.asset_name.length > 100) {
      errors.asset_name = '名称长度 2-100 个字符'
    }

    if (!item.asset_specification?.trim()) {
      errors.asset_specification = '规格型号不能为空'
    }

    // 单价校验
    const price = Number(item.asset_purchase_price)
    if (isNaN(price) || price < 0) {
      errors.asset_purchase_price = '单价必须是有效数字且不小于0'
    }

    // 采购数量校验
    const quantity = Number(item.asset_purchase_number)
    if (isNaN(quantity) || !Number.isInteger(quantity) || quantity < 1) {
      errors.asset_purchase_number = '采购数量必须是正整数'
    }

    // 入库日期格式
    if (item.asset_entry_date && !/^\d{4}-\d{2}-\d{2}$/.test(item.asset_entry_date)) {
      errors.asset_entry_date = '入库日期格式应为 YYYY-MM-DD'
    }

    if (!item.asset_type?.trim()) {
      errors.asset_type = '资产分类编码不能为空'
    }

    // 可选字段校验（如果有值）
    if (item.asset_purchase_date && !/^\d{4}-\d{2}-\d{2}$/.test(item.asset_purchase_date)) {
      errors.asset_purchase_date = '采购日期格式应为 YYYY-MM-DD'
    }

    if (item.asset_warranty_period) {
      const period = Number(item.asset_warranty_period)
      if (isNaN(period) || period < 0) {
        errors.asset_warranty_period = '质保期必须是有效数字'
      }
    }

    const validStatuses = ['in_store', 'recycled_pending', 'in_use', 'damaged', 'scrapped']
    if (item.asset_current_status && !validStatuses.includes(item.asset_current_status)) {
      errors.asset_current_status =
        '当前状态值非法，可选：in_store / recycled_pending / in_use / damaged / scrapped'
    }

    return { valid: Object.keys(errors).length === 0, errors }
  },

  // Excel 表格数据转换为 API 提交格式
  // 后端规则变更：asset_code 由后端自动生成，前端不再传递
  transformToApiData: (row: AssetExcelRow): AssetCreateForm => ({
    asset_name: row.asset_name.trim(),
    asset_specification: row.asset_specification.trim(),
    asset_brand: row.asset_brand?.trim() || null,
    asset_unit: row.asset_unit?.trim() || null,
    asset_purchase_price: String(Number(row.asset_purchase_price)),
    asset_purchase_number: Number(row.asset_purchase_number),
    asset_purchase_date: row.asset_purchase_date?.trim() || null,
    asset_warranty_period: row.asset_warranty_period ? Number(row.asset_warranty_period) : null,
    asset_entry_date: row.asset_entry_date.trim(),
    asset_type: row.asset_type.trim(),
    asset_entry_person: row.asset_entry_person?.trim() || null,
    asset_contract: row.asset_contract?.trim() || null,
    asset_applicant: row.asset_applicant?.trim() || null,
    asset_manager: row.asset_manager?.trim() || null,
    asset_using_location: row.asset_using_location?.trim() || null,
    asset_storage: row.asset_storage?.trim() || null,
    asset_description: row.asset_description?.trim() || null,
  }),

  // placeholder: 实际提交逻辑在 handleSubmit 中直接调用 batchCreateAssets
  createFn: async () => ({}) as AssetCreateForm,
  // 注意：后端规则变更：asset_code 由后端自动生成，不再作为前端唯一标识
  // 使用 asset_name 作为追踪字段（批量导入时用于标识提交状态）
  idField: 'asset_name',
} as const

// ===== 导入格式参考卡片数据（基于正确字段）=====
// 注意：后端规则变更：asset_code 由后端自动生成，Excel 中无需填写
export const assetHeaderExamples: HeaderExample[] = [
  {
    headerName: '资产编码',
    field: 'asset_code',
    required: false, // 改为非必填
    example: '（留空）',
    remark: '系统自动生成，无需填写',
  },
  {
    headerName: '资产名称',
    field: 'asset_name',
    required: true,
    example: '服务器主机',
    remark: '长度2-100',
  },
  {
    headerName: '规格型号',
    field: 'asset_specification',
    required: true,
    example: 'Dell R750',
    remark: '必填',
  },
  { headerName: '品牌', field: 'asset_brand', required: false, example: '戴尔', remark: '非必填' },
  { headerName: '单位', field: 'asset_unit', required: false, example: '台', remark: '非必填' },
  {
    headerName: '单价',
    field: 'asset_purchase_price',
    required: true,
    example: '35000',
    remark: '数字，≥0',
  },
  {
    headerName: '采购数量',
    field: 'asset_purchase_number',
    required: true,
    example: '2',
    remark: '正整数',
  },
  {
    headerName: '采购日期',
    field: 'asset_purchase_date',
    required: false,
    example: '2025-01-10',
    remark: 'YYYY-MM-DD',
  },
  {
    headerName: '质保期',
    field: 'asset_warranty_period',
    required: false,
    example: '3',
    remark: '数字，≥0',
  },
  {
    headerName: '入库日期',
    field: 'asset_entry_date',
    required: true,
    example: '2025-01-15',
    remark: 'YYYY-MM-DD',
  },
  {
    headerName: '当前状态',
    field: 'asset_current_status',
    required: false,
    example: 'in_store',
    remark: 'in_store/recycled_pending/in_use/damaged/scrapped',
  },
  {
    headerName: '资产分类编码',
    field: 'asset_type_code',
    required: true,
    example: 'SVR-01',
    remark: '关联资产分类',
  },
  {
    headerName: '录入人工号',
    field: 'asset_entry_person_jobcode',
    required: false,
    example: 'EMP001',
    remark: '员工工号',
  },
  {
    headerName: '合同编码',
    field: 'asset_contract_code',
    required: true,
    example: 'CT-2025-001',
    remark: '关联合同',
  },
  {
    headerName: '申请人工号',
    field: 'asset_applicant_jobcode',
    required: false,
    example: 'EMP002',
    remark: '员工工号',
  },
  {
    headerName: '保管人工号',
    field: 'asset_manager_jobcode',
    required: false,
    example: 'EMP003',
    remark: '员工工号',
  },
  {
    headerName: '使用地点',
    field: 'asset_using_location',
    required: false,
    example: '数据中心A',
    remark: '非必填',
  },
  {
    headerName: '仓库编码',
    field: 'asset_storage_code',
    required: true,
    example: 'WH-01',
    remark: '关联仓库',
  },
  {
    headerName: '资产描述',
    field: 'asset_description',
    required: false,
    example: '主节点服务器',
    remark: '非必填',
  },
]

export const assetExampleColumns: ExampleColumn[] = assetHeaderExamples.map((h) => ({
  prop: h.field,
  label: h.headerName,
}))

// 注意：后端规则变更：asset_code 由后端自动生成，示例数据中可为空
export const assetExampleRows = [
  {
    asset_code: '', // 留空，后端自动生成    asset_name: '服务器主机',
    asset_specification: 'Dell R750',
    asset_brand: '戴尔',
    asset_unit: '台',
    asset_purchase_price: 35000,
    asset_purchase_number: 2,
    asset_purchase_date: '2025-01-10',
    asset_warranty_period: 3,
    asset_entry_date: '2025-01-15',
    asset_current_status: 'in_store',
    asset_type_code: 'SVR-01',
    asset_entry_person_jobcode: 'EMP001',
    asset_contract_code: 'CT-2025-001',
    asset_applicant_jobcode: 'EMP002',
    asset_manager_jobcode: 'EMP003',
    asset_using_location: '数据中心A',
    asset_storage_code: 'WH-01',
    asset_description: '主节点服务器',
  },
  {
    asset_code: '', // 留空，后端自动生成    asset_name: '办公椅',
    asset_specification: '人体工学',
    asset_brand: 'Herman Miller',
    asset_unit: '台',
    asset_purchase_price: 2800,
    asset_purchase_number: 10,
    asset_purchase_date: '2024-12-20',
    asset_warranty_period: 2,
    asset_entry_date: '2024-12-25',
    asset_current_status: 'in_store',
    asset_type_code: 'FUR-01',
    asset_entry_person_jobcode: 'EMP004',
    asset_contract_code: '',
    asset_applicant_jobcode: 'EMP005',
    asset_manager_jobcode: 'EMP006',
    asset_using_location: '办公区B',
    asset_storage_code: 'WH-02',
    asset_description: '人体工学办公椅',
  },
]
