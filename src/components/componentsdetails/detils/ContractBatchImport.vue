<!--
  ContractBatchImport.vue
  合同批量导入页面
  功能：上传 Excel → 数据预览与验证 → 并发批量提交
  包含：导出模板 + 导入格式参考卡片（展示示例与规范）
  遵守 AGENTS 规范：
  - 使用组合式 API + TypeScript 严格模式
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
          <el-table-column label="供应商" prop="data.supplier_name" width="150" />
          <el-table-column label="合同金额" prop="data.contract_amount" width="120" />
          <el-table-column label="签订日期" prop="data.contract_start_date" width="110" />
          <el-table-column label="合同类型" prop="data.contract_type" width="120" />
          <el-table-column label="合同状态" prop="data.contract_status" width="100" />
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
      <BatchImportGuideCard
        :header-examples="headerExamples"
        :example-rows="exampleRows"
        :example-columns="exampleColumns"
        :notices="[
          '合同编码、合同名称、供应商、合同价格、签订日期、合同类型、保修期、结算状态为必填项',
          '合同类型可选值：purchase / service / information_construction / direct_procurement',
          '结算状态可选值：pending / settled',
          '日期格式统一为YYYY-MM-DD，签订日期不可为空，初验/终验日期可为空',
          'Excel 首行必须与「表头说明」中的中文列名完全一致',
          '导入前建议先「导出模板」，在模板基础上填写数据',
        ]"
      />

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



<script lang="ts" setup>
defineOptions({ name: 'ContractBatchImport' })

import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import ExcelJS from 'exceljs'
import { useBatchImport } from '@/composables/useBatchImport'
import {
  validationTagType,
  validationTagText,
  type HeaderExample,
  type ExampleColumn,
} from '@/utils/batchImportHelpers'
import BatchImportGuideCard from '@/components/commoncomponents/BatchImportGuideCard.vue'
import { contractAPI } from '@/api/contract'
import { useContractStore } from '@/stores/contractStore'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import type { ContractCreateForm } from '@/types/contract'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import type { ContractExcelRow } from '@/types/batch-import'

const router = useRouter()
const contractStore = useContractStore()

// 上传组件 ref 和文件列表状态
const uploadRef = ref<UploadInstance>()
const fileList = ref<UploadFile[]>([])
const localIsSubmitting = ref(false)

// ===== 预览表格分页状态 =====
const previewPageSize = 10
const currentPreviewPage = ref(1)

// ===== 批量导入配置 =====
const importConfig: BatchImportConfig<ContractExcelRow, ContractCreateForm> = {
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

    if (!item.supplier_name?.trim()) {
      errors.supplier_name = '供应商不能为空'
    }

    // 合同金额校验
    const price = Number(item.contract_amount)
    if (isNaN(price) || price < 0) {
      errors.contract_amount = '合同金额必须是有效数字且不小于0'
    }

    // 签订日期格式校验
    const signingDateRaw = item.contract_start_date
    const signingDate =
      typeof signingDateRaw === 'string' ? signingDateRaw.trim() : String(signingDateRaw ?? '')
    if (!signingDate) {
      errors.contract_start_date = '签订日期不能为空'
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(signingDate)) {
      errors.contract_start_date = '签订日期格式应为 YYYY-MM-DD'
    }

    // 合同类型校验
    const validTypes = [
      'tender_procurement',
      'service',
      'information_construction',
      'direct_procurement',
    ]
    if (!item.contract_type?.trim()) {
      errors.contract_type = '合同类型不能为空'
    } else if (!validTypes.includes(item.contract_type)) {
      errors.contract_type =
        '合同类型无效，可选：tender_procurement / service / information_construction / direct_procurement'
    }

    // 保修期校验
    const warranty = Number(item.contract_warranty_period)
    if (isNaN(warranty) || warranty < 0) {
      errors.contract_warranty_period = '保修期必须是有效数字且不小于0'
    }

    // 合同状态校验
    const validStatuses = [
      'purchasing',
      'purchase_finished',
      'receive_check',
      'initial_check',
      'project_settlement',
      'settlement_done',
      'final_check',
      'project_finished',
    ]
    if (!item.contract_status?.trim()) {
      errors.contract_status = '合同状态不能为空'
    } else if (!validStatuses.includes(item.contract_status)) {
      errors.contract_status =
        '合同状态无效，可选：purchasing / purchase_finished / receive_check / initial_check / project_settlement / settlement_done / final_check / project_finished'
    }

    // 可选字段校验
    if (item.initial_check_date) {
      const dateRaw = item.initial_check_date
      const dateStr = typeof dateRaw === 'string' ? dateRaw.trim() : String(dateRaw)
      if (dateStr && !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.initial_check_date = '初验日期格式应为 YYYY-MM-DD'
      }
    }

    if (item.final_check_date) {
      const dateRaw = item.final_check_date
      const dateStr = typeof dateRaw === 'string' ? dateRaw.trim() : String(dateRaw)
      if (dateStr && !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        errors.final_check_date = '终验日期格式应为 YYYY-MM-DD'
      }
    }

    if (item.settlemented_price !== undefined && item.settlemented_price !== '') {
      const settlementPrice = Number(item.settlemented_price)
      if (isNaN(settlementPrice) || settlementPrice < 0) {
        errors.settlemented_price = '结算价格必须是有效数字且不小于0'
      }
    }

    if (item.amount_paid !== undefined && item.amount_paid !== '') {
      const paidPrice = Number(item.amount_paid)
      if (isNaN(paidPrice) || paidPrice < 0) {
        errors.amount_paid = '已付金额必须是有效数字且不小于0'
      }
    }

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
      合同金额: '100000',
      签订日期: '2025-01-15',
      合同类型: 'tender_procurement',
      保修期: '3',
      初验日期: '2025-02-01',
      终验日期: '2025-06-30',
      合同状态: 'purchasing',
      结算价格: '50000',
      已付金额: '50000',
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
const headerExamples: HeaderExample[] = [
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

const exampleColumns: ExampleColumn[] = headerExamples.map((h) => ({
  prop: h.field,
  label: h.headerName,
}))

const exampleRows = [
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

/**
 * 提交处理：调用后端批量创建接口，一次性提交所有有效数据
 * 解决原有逐条创建因并发请求去重导致的数据丢失问题
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

// ===== 清空数据 （同时重置上传组件状态和分页）====
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
