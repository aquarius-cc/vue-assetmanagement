<!--
  ContractBatchImport.vue
  合同批量导入页面
  功能：上?Excel ?数据预览与验??并发批量提交
  包含：导出模?+ 导入格式参考卡片（展示示例与规范）
  遵守 AGENTS 规范?  - 组合?API + TypeScript 严格模式
  - 样式隔离 scoped
  - 禁止 any 类型
  - 单向数据流：通过 useBatchImport 封装业务逻辑
  - 全量使用 @/ 别名导入
-->
<template>
  <div class="batch-import">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>合同批量导入</span>
        </div>
      </template>

      <!-- 文件上传与模板导出区 -->
      <div class="upload-actions">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :on-change="handleUploadChange"
          :limit="1"
          accept=".xlsx,.xls"
          :file-list="fileList"
          class="upload-section"
        >
          <el-button type="primary" :icon="Upload">选择 Excel 文件</el-button>
          <template #tip>
            <div class="upload-tip">仅支持 .xlsx / .xls 文件，首行为表头（中文列名）</div>
          </template>
        </el-upload>
        <el-button type="warning" @click="handleExportTemplate">导出模板</el-button>
      </div>
      <!-- 解析错误提示 -->
      <div v-if="previewData.length === 0 && parseError" class="parse-error-card">
        <el-alert
          title="无法展示数据"
          type="error"
          :description="`解析失败：${parseError}`"
          show-icon
          :closable="false"
        />
      </div>
      <!-- 数据预览表格 （使用分页数据）-->
      <div v-if="previewData.length > 0" class="preview-table">
        <h3 class="section-title">
          数据预览 ({{ previewData.length }} 条，有效 {{ validDataCount }} 条)
        </h3>
        <el-table :data="paginatedPreviewData" border stripe max-height="500">
          <el-table-column label="验证结果" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="validationTagType(row)" size="small">
                {{ validationTagText(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="合同编码" prop="data.contract_code" width="150" />
          <el-table-column label="合同名称" prop="data.contract_name" min-width="200" />
          <el-table-column label="供应商" prop="data.contract_supplier" width="150" />
          <el-table-column label="合同价格" prop="data.contract_price" width="120" />
          <el-table-column label="签订日期" prop="data.contract_signing_date" width="110" />
          <el-table-column label="合同类型" prop="data.contract_type" width="120" />
          <el-table-column label="结算状态" prop="data.contract_settledment_status" width="100" />
          <el-table-column label="错误信息" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.validationStatus === 'error'" class="error-text">
                {{ row.validationErrorSummary }}
              </span>
              <span v-else-if="row.submitStatus === 'error'" class="error-text">
                {{ row.submitError || '提交失败' }}
              </span>
            </template>
          </el-table-column>
        </el-table>
        <!-- 分页组件 -->
        <el-pagination
          v-if="previewData.length > previewPageSize"
          :current-page="currentPreviewPage"
          :page-size="previewPageSize"
          :total="previewData.length"
          layout="total, prev, pager, next, jumper"
          class="pagination"
          @current-change="handlePreviewPageChange"
        />
      </div>
      <!-- 导入格式参考卡片 -->
      <div class="import-guide-card">
        <div class="guide-header">
          <el-icon><InfoFilled /></el-icon>
          <span>导入格式参考</span>
        </div>
        <div class="guide-content">
          <!-- 必填列说明 -->
          <div class="guide-section">
            <div class="section-title">📌 必填列说明</div>
            <el-table :data="headerExamples" border size="small" style="width: 100%">
              <el-table-column prop="headerName" label="Excel 表头（中文）" width="180" />
              <el-table-column prop="field" label="对应字段" width="180" />
              <el-table-column prop="required" label="必填" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'" size="small">
                    {{ row.required ? '必填' : '选填' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="example" label="示例" />
              <el-table-column prop="remark" label="备注" />
            </el-table>
          </div>
          <!-- 示例数据 -->
          <div class="guide-section">
            <div class="section-title">📝 示例数据（参考填写）</div>
            <el-table :data="exampleRows" border size="small" style="width: 100%">
              <el-table-column
                v-for="col in exampleColumns"
                :key="col.prop"
                :prop="col.prop"
                :label="col.label"
                min-width="120"
              />
            </el-table>
          </div>
          <!-- 注意事项 -->
          <div class="guide-section">
            <div class="section-title">⚠️ 注意事项</div>
            <ul class="notice-list">
              <li>
                合同编码、合同名称、供应商、合同价格、签订日期、合同类型、保修期、结算状态为必填项
              </li>
              <li>
                合同类型可选值：purchase / service / information_construction / direct_procurement
              </li>
              <li>结算状态可选值：pending / settled</li>
              <li>日期格式统一为YYYY-MM-DD，签订日期不可为空，初验/终验日期可为空</li>
              <li>Excel 首行必须与「表头说明」中的中文列名完全一致</li>
              <li>导入前建议先「导出模板」，在模板基础上填写数据</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <el-button
          type="success"
          :loading="localIsSubmitting"
          :disabled="validDataCount === 0"
          @click="handleSubmit"
        >
          提交有效数据 ({{ validDataCount }})
        </el-button>
        <el-button @click="handleClear">清空</el-button>
        <el-button type="info" @click="goBack">返回</el-button>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts">
export default { name: 'ContractBatchImport' }
</script>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import { Upload, InfoFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import ExcelJS from 'exceljs'
import { useBatchImport } from '@/composables/useBatchImport'
import type { ValidatedRow } from '@/composables/useBatchImport'
import { contractAPI } from '@/api/contract'
import { useContractStore } from '@/stores/contractStore'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import type { ContractCreateForm, ContractSettlementStatus } from '@/types/contract'
import type { BatchImportConfig } from '@/utils/batchImport/types'

// ===== Excel 行数据类?=====
interface ContractExcelRow {
  contract_code: string
  contract_name: string
  contract_supplier: string
  contract_price: number | string
  contract_signing_date: string
  contract_type: string
  contract_warranty_period: number | string
  contract_preliminary_acceptance_date?: string
  contract_final_acceptance_date?: string
  contract_settledment_status: string
  contract_settledment_price?: number | string
  contract_paid_count_number?: number | string
  contract_paid_price?: number | string
  contract_paid_record?: string
}

const router = useRouter()
const contractStore = useContractStore()

// 上传组件 ref 和文件列表状态
const uploadRef = ref<UploadInstance>()
const fileList = ref<UploadFile[]>([])
const localIsSubmitting = ref(false)

// ===== 预览表格分页状?=====
const previewPageSize = 10
const currentPreviewPage = ref(1)

// ===== 批量导入配置 =====
const importConfig: BatchImportConfig<ContractExcelRow, ContractCreateForm> = {
  entityName: '合同',

  // Excel 表头中文 -> 数据字段映射
  excelHeaderMap: {
    合同编码: 'contract_code',
    合同名称: 'contract_name',
    供应商: 'contract_supplier',
    合同价格: 'contract_price',
    签订日期: 'contract_signing_date',
    合同类型: 'contract_type',
    保修期: 'contract_warranty_period',
    初验日期: 'contract_preliminary_acceptance_date',
    终验日期: 'contract_final_acceptance_date',
    结算状态: 'contract_settledment_status',
    结算价格: 'contract_settledment_price',
    已付次数: 'contract_paid_count_number',
    已付金额: 'contract_paid_price',
    付款记录: 'contract_paid_record',
  },

  // 必填字段
  requiredFields: [
    'contract_code',
    'contract_name',
    'contract_supplier',
    'contract_price',
    'contract_signing_date',
    'contract_type',
    'contract_warranty_period',
    'contract_settledment_status',
  ],

  // 单条数据验证
  validateItem: (item: ContractExcelRow) => {
    const errors: Record<string, string> = {}

    // 必填字段非空校验
    if (!item.contract_code?.trim()) {
      errors.contract_code = '合同编码不能为空'
    }

    if (!item.contract_name?.trim()) {
      errors.contract_name = '合同名称不能为空'
    }

    if (!item.contract_supplier?.trim()) {
      errors.contract_supplier = '供应商不能为空'
    }

    // 合同价格校验
    const price = Number(item.contract_price)
    if (isNaN(price) || price < 0) {
      errors.contract_price = '合同价格必须是有效数字且不小?'
    }

    // 签订日期格式校验
    // Excel 解析后的日期可能为字符串，需要统一转换为字符串
    const signingDateRaw = item.contract_signing_date
    const signingDate =
      typeof signingDateRaw === 'string' ? signingDateRaw.trim() : String(signingDateRaw ?? '')
    if (!signingDate) {
      errors.contract_signing_date = '签订日期不能为空'
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(signingDate)) {
      errors.contract_signing_date = '签订日期格式应为 YYYY-MM-DD'
    }

    // 合同类型校验
    const validTypes = ['purchase', 'service', 'information_construction', 'direct_procurement']
    if (!item.contract_type?.trim()) {
      errors.contract_type = '合同类型不能为空'
    } else if (!validTypes.includes(item.contract_type)) {
      errors.contract_type =
        '合同类型无效，可选：purchase / service / information_construction / direct_procurement'
    }

    // 保修期校验
    const warranty = Number(item.contract_warranty_period)
    if (isNaN(warranty) || warranty < 0) {
      errors.contract_warranty_period = '保修期必须是有效数字且不小于0'
    }

    // 结算状态校验
    const validStatuses = ['pending', 'settled']
    if (!item.contract_settledment_status?.trim()) {
      errors.contract_settledment_status = '结算状态不能为空'
    } else if (!validStatuses.includes(item.contract_settledment_status)) {
      errors.contract_settledment_status = '结算状态无效，可选：pending / settled'
    }

    // 可选字段校验（如果有值）
    // Excel 解析后的日期可能?Date 对象，需要统一转换为字符串
    if (item.contract_preliminary_acceptance_date) {
      const dateRaw = item.contract_preliminary_acceptance_date
      const dateStr = typeof dateRaw === 'string' ? dateRaw.trim() : String(dateRaw)
      if (dateStr && !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.contract_preliminary_acceptance_date = '初验日期格式应为 YYYY-MM-DD'
      }
    }

    if (item.contract_final_acceptance_date) {
      const dateRaw = item.contract_final_acceptance_date
      const dateStr = typeof dateRaw === 'string' ? dateRaw.trim() : String(dateRaw)
      if (dateStr && !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.contract_final_acceptance_date = '终验日期格式应为 YYYY-MM-DD'
      }
    }

    if (item.contract_settledment_price !== undefined && item.contract_settledment_price !== '') {
      const settlementPrice = Number(item.contract_settledment_price)
      if (isNaN(settlementPrice) || settlementPrice < 0) {
        errors.contract_settledment_price = '结算价格必须是有效数字且不小于0'
      }
    }

    if (item.contract_paid_count_number !== undefined && item.contract_paid_count_number !== '') {
      const paidCount = Number(item.contract_paid_count_number)
      if (isNaN(paidCount) || paidCount < 0 || !Number.isInteger(paidCount)) {
        errors.contract_paid_count_number = '已付次数必须是非负整数'
      }
    }

    if (item.contract_paid_price !== undefined && item.contract_paid_price !== '') {
      const paidPrice = Number(item.contract_paid_price)
      if (isNaN(paidPrice) || paidPrice < 0) {
        errors.contract_paid_price = '已付金额必须是有效数字且不小于0'
      }
    }

    return { valid: Object.keys(errors).length === 0, errors }
  },

  // Excel 数据转换为 API 提交数据
  transformToApiData: (row: ContractExcelRow): ContractCreateForm => ({
    contract_code: row.contract_code.trim(),
    contract_name: row.contract_name.trim(),
    contract_supplier: row.contract_supplier.trim(),
    contract_price: Number(row.contract_price),
    // Excel 解析后的日期可能是字符串，需要转换为字符串
    contract_signing_date:
      typeof row.contract_signing_date === 'string'
        ? row.contract_signing_date.trim()
        : String(row.contract_signing_date),
    contract_type: row.contract_type.trim(),
    contract_warranty_period: Number(row.contract_warranty_period),
    contract_preliminary_acceptance_date:
      typeof row.contract_preliminary_acceptance_date === 'string'
        ? row.contract_preliminary_acceptance_date.trim()
        : row.contract_preliminary_acceptance_date
          ? String(row.contract_preliminary_acceptance_date)
          : null,
    contract_final_acceptance_date:
      typeof row.contract_final_acceptance_date === 'string'
        ? row.contract_final_acceptance_date.trim()
        : row.contract_final_acceptance_date
          ? String(row.contract_final_acceptance_date)
          : null,
    contract_settledment_status: row.contract_settledment_status.trim() as ContractSettlementStatus,
    contract_settledment_price: row.contract_settledment_price
      ? Number(row.contract_settledment_price)
      : 0,
    contract_paid_count_number: row.contract_paid_count_number
      ? Number(row.contract_paid_count_number)
      : 0,
    contract_paid_price: row.contract_paid_price ? Number(row.contract_paid_price) : 0,
    contract_paid_record: row.contract_paid_record?.trim() || '',
  }),

  // placeholder: 实际提交逻辑调用 batchCreateContracts 函数
  createFn: async () => ({}) as ContractCreateForm,
  idField: 'contract_code',
}

// ===== 使用批量导入 Hook（仅用于 Excel 解析和数据验证）=====
// 注意：从 useBatchImport 获取原始的 handleFileChange（它期望原生 File 对象）
const {
  previewData,
  validDataCount,
  parseError, // 新增
  handleFileChange: rawHandleFileChange,
  clearData,
} = useBatchImport<ContractExcelRow, ContractCreateForm>(importConfig)

// 分页后的预览数据
const paginatedPreviewData = computed(() => {
  const start = (currentPreviewPage.value - 1) * previewPageSize
  const end = start + previewPageSize
  return previewData.value.slice(start, end)
})

// 重置分页到第一行
const resetPreviewPage = () => {
  currentPreviewPage.value = 1
}

// ===== 适配 el-upload onChange 事件 =====
const handleUploadChange = async (uploadFile: UploadFile, uploadFileList: UploadFile[]) => {
  fileList.value = uploadFileList
  const rawFile = uploadFile.raw
  if (!rawFile) {
    ElMessage.warning('无法读取文件，请重新选择')
    return
  }
  // 调用批量导入的核心处理函数（内部会设置 parseError 和 previewData）
  await rawHandleFileChange(rawFile)
  // 文件解析完成后重置分页到第一行
  resetPreviewPage() // 新文件加载后重置页码
}

// ===== 验证状态标签辅助函数 =====
const validationTagType = (row: ValidatedRow<ContractExcelRow>) => {
  if (row.submitStatus === 'error') return 'danger'
  if (row.submitStatus === 'success') return 'success'
  if (row.validationStatus === 'error') return 'danger'
  return 'success'
}

const validationTagText = (row: ValidatedRow<ContractExcelRow>) => {
  if (row.submitStatus === 'error') return '提交失败'
  if (row.submitStatus === 'success') return '已提交'
  if (row.validationStatus === 'error') return '验证失败'
  return '有效'
}

// ===== 分页页码改变 =====
const handlePreviewPageChange = (page: number) => {
  currentPreviewPage.value = page
}

// ===== 导出模板 =====
const handleExportTemplate = async () => {
  try {
    const headers = Object.keys(importConfig.excelHeaderMap)
    const exampleRowData: Record<string, string> = {
      合同编码: 'CT-2025-001',
      合同名称: '服务器采购合同',
      供应商: 'XX科技有限公司',
      合同价格: '100000',
      签订日期: '2025-01-15',
      合同类型: 'purchase',
      保修期: '3',
      初验日期: '2025-02-01',
      终验日期: '2025-06-30',
      结算状态: 'pending',
      结算价格: '50000',
      已付次数: '1',
      已付金额: '50000',
      付款记录: '2025-01-20支付首付 20%',
    }

    // 使用 ExcelJS 创建模板工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('合同导入模板')

    // 添加表头行和示例数据
    worksheet.addRow(headers)
    worksheet.addRow(headers.map((h) => exampleRowData[h] ?? ''))

    // 设置列宽
    worksheet.columns = headers.map(() => ({ width: 20 }))

    // 生成并下载文件
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '合同批量导入模板.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    ElMessage.success('模板下载成功')
  } catch (error) {
    console.error('导出模板失败:', error)
    ElMessage.error('导出模板失败，请稍后重试')
  }
}

// ===== 导入格式参考卡片 =====
const headerExamples = [
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
    field: 'contract_supplier',
    required: true,
    example: 'XX科技有限公司',
    remark: '供应商名称',
  },
  {
    headerName: '合同价格',
    field: 'contract_price',
    required: true,
    example: '100000',
    remark: '数字，≥0',
  },
  {
    headerName: '签订日期',
    field: 'contract_signing_date',
    required: true,
    example: '2025-01-15',
    remark: 'YYYY-MM-DD',
  },
  {
    headerName: '合同类型',
    field: 'contract_type',
    required: true,
    example: 'purchase',
    remark: 'purchase/service/information_construction/direct_procurement',
  },
  {
    headerName: '保修期',
    field: 'contract_warranty_period',
    required: true,
    example: '3',
    remark: '年，数字?',
  },
  {
    headerName: '初验日期',
    field: 'contract_preliminary_acceptance_date',
    required: false,
    example: '2025-02-01',
    remark: 'YYYY-MM-DD，可选',
  },
  {
    headerName: '终验日期',
    field: 'contract_final_acceptance_date',
    required: false,
    example: '2025-06-30',
    remark: 'YYYY-MM-DD，可选',
  },
  {
    headerName: '结算状态',
    field: 'contract_settledment_status',
    required: true,
    example: 'pending',
    remark: 'pending/settled',
  },
  {
    headerName: '结算价格',
    field: 'contract_settledment_price',
    required: false,
    example: '50000',
    remark: '数字，≥0',
  },
  {
    headerName: '已付次数',
    field: 'contract_paid_count_number',
    required: false,
    example: '1',
    remark: '非负整数',
  },
  {
    headerName: '已付金额',
    field: 'contract_paid_price',
    required: false,
    example: '50000',
    remark: '数字，≥0',
  },
  {
    headerName: '付款记录',
    field: 'contract_paid_record',
    required: false,
    example: '2025-01-20支付首付?0%',
    remark: '文本说明',
  },
]

const exampleColumns = headerExamples.map((h) => ({ prop: h.field, label: h.headerName }))

const exampleRows = [
  {
    contract_code: 'CT-2025-001',
    contract_name: '服务器采购合同',
    contract_supplier: 'XX科技有限公司',
    contract_price: 100000,
    contract_signing_date: '2025-01-15',
    contract_type: 'purchase',
    contract_warranty_period: 3,
    contract_preliminary_acceptance_date: '2025-02-01',
    contract_final_acceptance_date: '2025-06-30',
    contract_settledment_status: 'pending',
    contract_settledment_price: 50000,
    contract_paid_count_number: 1,
    contract_paid_price: 50000,
    contract_paid_record: '2025-01-20支付首付?0%',
  },
  {
    contract_code: 'CT-2025-002',
    contract_name: '软件服务合同',
    contract_supplier: 'YY信息技术有限公司',
    contract_price: 50000,
    contract_signing_date: '2025-02-10',
    contract_type: 'service',
    contract_warranty_period: 1,
    contract_preliminary_acceptance_date: '',
    contract_final_acceptance_date: '2025-12-31',
    contract_settledment_status: 'settled',
    contract_settledment_price: 50000,
    contract_paid_count_number: 2,
    contract_paid_price: 50000,
    contract_paid_record: '2025-02-20支付30000?025-06-01支付20000',
  },
]

/**
 * 提交处理：调用后端批量创建接口，一次性提交所有有效数据
 * * 解决原有逐条创建因并发请求去重导致的数据丢失问题
 */
const handleSubmit = async () => {
  if (validDataCount.value === 0) {
    ElMessage.warning('没有有效数据可提交')
    return
  }

  localIsSubmitting.value = true
  try {
    const validRows = previewData.value.filter((r) => r.validationStatus === 'success')
    const apiDataList = validRows.map((r) => importConfig.transformToApiData(r.data))

    previewData.value.forEach((row) => {
      row.submitStatus = undefined
      row.submitError = undefined
    })

    const result = await contractAPI.batchCreateContracts(apiDataList)

    // 使用 index 匹配：后端 fail_items 的 index 对应 validRows 的数组索引
    if (result.fail_count > 0) {
      const failedMap = new Map<number, string>()
      result.fail_items.forEach((failed) => {
        failedMap.set(failed.index, failed.error_message)
      })

      validRows.forEach((row, idx) => {
        if (failedMap.has(idx)) {
          row.submitStatus = 'error'
          row.submitError = failedMap.get(idx) || '提交失败'
        } else {
          row.submitStatus = 'success'
        }
      })
    } else {
      validRows.forEach((row) => {
        row.submitStatus = 'success'
      })
    }

    if (result.fail_count === 0) {
      ElMessage.success(`全部导入成功！共 ${result.success_count} 条`)
      // 通知父页面刷新数据
      contractStore.setRefreshFlag(true)
    } else {
      ElMessage.warning(`导入完成：成功 ${result.success_count} 条，失败 ${result.fail_count} 条`)
    }
  } catch (error) {
    const msg = extractErrorMessage(error)
    ElMessage.error(`导入失败：${msg}`)
  } finally {
    localIsSubmitting.value = false
  }
}

// ===== 清空数据 （同时重置上传组件状态和分页） =====
const handleClear = () => {
  clearData()
  fileList.value = []
  uploadRef.value?.clearFiles()
  resetPreviewPage()
  ElMessage.info('已清空所有数据')
}

// ===== 返回上一页 =====
const goBack = () => {
  router.go(-1)
}
</script>

<style scoped lang="scss">
.batch-import {
  padding: 24px;
  .box-card {
    height: 100%;
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
    color: var(--color-primary-light);
  }
  .upload-actions {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 24px;
    .upload-section {
      flex: 1;
    }
  }
  .upload-tip {
    margin-top: 8px;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .import-guide-card {
    background-color: var(--card-background-muted);
    border: 1px solid var(--border-color-light);
    border-radius: 8px;
    margin-bottom: 24px;
    overflow: hidden;
    .guide-header {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: var(--color-primary-lighter);
      padding: 12px 16px;
      font-weight: 600;
      color: var(--color-primary-light);
      border-bottom: 1px solid var(--color-primary-light-border);
      .el-icon {
        font-size: 18px;
      }
    }
    .guide-content {
      padding: 16px;
      .guide-section {
        margin-bottom: 20px;
        &:last-child {
          margin-bottom: 0;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
          padding-left: 4px;
          border-left: 3px solid var(--color-primary-light);
        }
      }
      .notice-list {
        margin: 0;
        padding-left: 20px;
        li {
          line-height: 1.8;
          color: var(--text-regular);
          font-size: 13px;
        }
      }
    }
  }
  .parse-error-card {
    margin-bottom: 24px;
    :deep(.el-alert) {
      border-radius: 8px;
    }
  }
  .preview-table {
    margin-bottom: 24px;
    .section-title {
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--color-primary-light);
    }
    .pagination {
      margin-top: 12px;
      text-align: right;
    }
  }
  .error-text {
    color: var(--color-danger-light);
    font-size: 13px;
  }
  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }
}
</style>
