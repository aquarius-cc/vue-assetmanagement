<!--
  DamagedAssetBatchImport.vue
  待报废资产批量导入页面
  功能：上传 Excel → 数据预览与验证 → 并发批量提交
  包含：导出模板 + 导入格式参考卡片（展示示例与规范）
-->
<template>
  <div class="batch-import">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>待报废资产批量导入</span>
        </div>
      </template>

      <div class="upload-actions">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :on-change="handleFileChange"
          :limit="1"
          accept=".xlsx,.xls"
          :file-list="fileList"
          class="upload-section"
        >
          <el-button type="primary" :icon="Upload">选择 Excel 文件</el-button>
          <template #tip>
            <div class="upload-tip">仅支持 .xlsx / .xls，首行为表头（中文列名）</div>
          </template>
        </el-upload>
        <el-button type="warning" @click="handleExportTemplate">导出模板</el-button>
      </div>

      <div class="import-guide-card">
        <div class="guide-header">
          <el-icon><InfoFilled /></el-icon>
          <span>导入格式参考</span>
        </div>
        <div class="guide-content">
          <div class="guide-section">
            <div class="section-title">📌 必填列说明</div>
            <el-table :data="headerExamples" border size="small" style="width: 100%">
              <el-table-column prop="headerName" label="Excel 表头（中文）" width="180" />
              <el-table-column prop="field" label="对应字段" width="220" />
              <el-table-column prop="required" label="必填" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'" size="small">
                    {{ row.required ? '是' : '否' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="example" label="示例值" />
              <el-table-column prop="remark" label="备注" />
            </el-table>
          </div>
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
          <div class="guide-section">
            <div class="section-title">⚠️ 注意事项</div>
            <ul class="notice-list">
              <li>资产编码、待报废数量、仓库编码为必填项</li>
              <li>审批状态可选值：pending（待审批）/ approved（已批准）/ rejected（已拒绝）</li>
              <li>日期格式统一为 YYYY-MM-DD</li>
              <li>Excel 首行必须与「表头说明」中的中文列名完全一致</li>
              <li>导入前建议先「导出模板」，在模板基础上填写数据</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="previewData.length > 0" class="preview-table">
        <h3 class="section-title">
          数据预览 ({{ previewData.length }} 条，有效 {{ validDataCount }} 条)
        </h3>
        <el-table :data="previewData" border stripe max-height="500">
          <el-table-column label="验证" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="validationTagType(row)" size="small">
                {{ validationTagText(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="资产编码" prop="data.damaged_asset_code" width="150" />
          <el-table-column label="待报废数量" prop="data.damaged_asset_number" width="100" />
          <el-table-column label="仓库编码" prop="data.damaged_asset_storage_code" width="120" />
          <el-table-column label="合同编码" prop="data.damaged_asset_contract_code" width="120" />
          <el-table-column label="待报废日期" prop="data.damaged_date" width="110" />
          <el-table-column label="审批状态" prop="data.approval_status" width="100" />
          <el-table-column label="审批人" prop="data.approver" width="100" />
          <el-table-column
            label="描述"
            prop="data.damaged_asset_description"
            show-overflow-tooltip
          />
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
      </div>

      <div class="form-actions">
        <el-button
          type="success"
          :loading="isSubmitting"
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
export default { name: 'DamagedAssetBatchImport' }
</script>

<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { Upload, InfoFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import ExcelJS from 'exceljs'
import { useBatchImport } from '@/composables/useBatchImport'
import type { ValidatedRow } from '@/composables/useBatchImport'
import { useDamagedAssetStore } from '@/stores/damagedAssetStore'
import type { DamagedAssetCreateForm } from '@/utils/DamagedAsset'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import type { DamagedAssetExcelRow } from '@/types/batch-import'

// ===== 状态与实例 =====
const router = useRouter()
const damagedAssetStore = useDamagedAssetStore()
const fileList = ref<File[]>([])

// ===== 批量导入配置 =====
const importConfig: BatchImportConfig<DamagedAssetExcelRow, DamagedAssetCreateForm> = {
  entityName: '待报废资产',
  excelHeaderMap: {
    资产编码: 'damaged_asset_code',
    待报废数量: 'damaged_asset_number',
    仓库编码: 'damaged_asset_storage_code',
    合同编码: 'damaged_asset_contract_code',
    待报废日期: 'damaged_date',
    审批状态: 'approval_status',
    审批人: 'approver',
    描述: 'damaged_asset_description',
  },
  requiredFields: ['damaged_asset_code', 'damaged_asset_number', 'damaged_asset_storage_code'],
  validateItem: (item: DamagedAssetExcelRow) => {
    const errors: Record<string, string> = {}
    if (!item.damaged_asset_code?.trim()) errors.damaged_asset_code = '资产编码不能为空'
    const quantity = Number(item.damaged_asset_number)
    if (isNaN(quantity) || !Number.isInteger(quantity) || quantity < 1)
      errors.damaged_asset_number = '待报废数量必须是正整数'
    if (!item.damaged_asset_storage_code?.trim())
      errors.damaged_asset_storage_code = '仓库编码不能为空'
    const dateValue = item.damaged_date?.trim()
    if (dateValue && !/^\d{4}-\d{2}-\d{2}$/.test(dateValue))
      errors.damaged_date = '待报废日期格式应为 YYYY-MM-DD'
    const validStatuses = ['pending', 'approved', 'rejected']
    if (item.approval_status && !validStatuses.includes(item.approval_status))
      errors.approval_status = '审批状态非法，可选：pending / approved / rejected'
    return { valid: Object.keys(errors).length === 0, errors }
  },
  transformToApiData: (row: DamagedAssetExcelRow): DamagedAssetCreateForm => ({
    damaged_asset_code: row.damaged_asset_code?.trim() || null,
    damaged_asset_number: Number(row.damaged_asset_number),
    damaged_asset_storage_code: row.damaged_asset_storage_code.trim(),
    damaged_asset_contract_code: row.damaged_asset_contract_code?.trim() || null,
    damaged_date: row.damaged_date?.trim() || null,
    approval_status: row.approval_status?.trim() || null,
    approver: row.approver?.trim() || null,
    damaged_asset_description: row.damaged_asset_description?.trim() || null,
  }),
  createFn: (data: DamagedAssetCreateForm) => damagedAssetStore.create(data),
  idField: 'damaged_asset_code',
  concurrency: 5,
}

const {
  previewData,
  validDataCount,
  isSubmitting,
  handleFileChange: _handleFileChange,
  submitBatchData,
  clearData,
} = useBatchImport<DamagedAssetExcelRow, DamagedAssetCreateForm>(importConfig)

const handleFileChange = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    _handleFileChange(uploadFile.raw)
  } else {
    ElMessage.error('文件读取失败，请重新选择')
  }
}

// ===== 验证状态标签 =====
const validationTagType = (row: ValidatedRow<DamagedAssetExcelRow>) => {
  if (row.submitStatus === 'error') return 'danger'
  if (row.submitStatus === 'success') return 'success'
  if (row.validationStatus === 'error') return 'danger'
  return 'success'
}

const validationTagText = (row: ValidatedRow<DamagedAssetExcelRow>) => {
  if (row.submitStatus === 'error') return '提交失败'
  if (row.submitStatus === 'success') return '已提交'
  if (row.validationStatus === 'error') return '验证失败'
  return '有效'
}

// ===== 导出模板 =====
const handleExportTemplate = async () => {
  try {
    const headers = Object.keys(importConfig.excelHeaderMap)
    const exampleRowData: Record<string, string> = {
      资产编码: 'ASSET-001',
      待报废数量: '1',
      仓库编码: 'STG001',
      合同编码: 'CT-001',
      待报废日期: '2025-06-01',
      审批状态: 'pending',
      审批人: '张三',
      描述: '设备老化无法使用',
    }
    // 使用 ExcelJS 创建模板工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('待报废资产导入模板')

    // 添加表头行和示例数据行
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
    link.download = '待报废资产批量导入模板.xlsx'
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

// ===== 导入格式参考数据 =====
const headerExamples = [
  {
    headerName: '资产编码',
    field: 'damaged_asset_code',
    required: true,
    example: 'ASSET-001',
    remark: '关联资产编码',
  },
  {
    headerName: '待报废数量',
    field: 'damaged_asset_number',
    required: true,
    example: '1',
    remark: '正整数',
  },
  {
    headerName: '仓库编码',
    field: 'damaged_asset_storage_code',
    required: true,
    example: 'STG001',
    remark: '关联仓库编码',
  },
  {
    headerName: '合同编码',
    field: 'damaged_asset_contract_code',
    required: false,
    example: 'CT-001',
    remark: '关联合同编码',
  },
  {
    headerName: '待报废日期',
    field: 'damaged_date',
    required: false,
    example: '2025-06-01',
    remark: 'YYYY-MM-DD',
  },
  {
    headerName: '审批状态',
    field: 'approval_status',
    required: false,
    example: 'pending',
    remark: 'pending/approved/rejected',
  },
  {
    headerName: '审批人',
    field: 'approver',
    required: false,
    example: '张三',
    remark: '审批人姓名',
  },
  {
    headerName: '描述',
    field: 'damaged_asset_description',
    required: false,
    example: '设备老化',
    remark: '报废原因描述',
  },
]

const exampleColumns = [
  { prop: 'damaged_asset_code', label: '资产编码' },
  { prop: 'damaged_asset_number', label: '待报废数量' },
  { prop: 'damaged_asset_storage_code', label: '仓库编码' },
  { prop: 'damaged_asset_contract_code', label: '合同编码' },
  { prop: 'damaged_date', label: '待报废日期' },
  { prop: 'approval_status', label: '审批状态' },
  { prop: 'approver', label: '审批人' },
  { prop: 'damaged_asset_description', label: '描述' },
]

const exampleRows = [
  {
    damaged_asset_code: 'ASSET-001',
    damaged_asset_number: 1,
    damaged_asset_storage_code: 'STG001',
    damaged_asset_contract_code: 'CT-001',
    damaged_date: '2025-06-01',
    approval_status: 'pending',
    approver: '张三',
    damaged_asset_description: '设备老化无法使用',
  },
  {
    damaged_asset_code: 'ASSET-002',
    damaged_asset_number: 2,
    damaged_asset_storage_code: 'STG002',
    damaged_asset_contract_code: 'CT-002',
    damaged_date: '2025-05-15',
    approval_status: 'approved',
    approver: '李四',
    damaged_asset_description: '主板损坏无法修复',
  },
]

// ===== 提交与清空 =====
const handleSubmit = async () => {
  const success = await submitBatchData()
  if (success) {
    damagedAssetStore.setRefreshFlag(true)
    ElMessage.success('待报废资产导入成功')
  }
}

const handleClear = () => {
  clearData()
  fileList.value = []
}

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
