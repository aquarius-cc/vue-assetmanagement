<!--
  UnregisteredAssetBatchImport.vue
  未登记资产批量导入页面
  功能：上传 Excel → 数据预览与验证 → 并发批量提交
  包含：导出模板 + 导入格式参考卡片（展示示例与规范）
-->
<template>
  <div class="batch-import">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>未登记资产批量导入</span>
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
              <li>场景类型、发现日期、发现地点、资产名称为必填项</li>
              <li>场景类型可选值：s1_no_record / s2_no_outasset / s3_status_mismatch</li>
              <li>S2/S3 场景下，关联资产编码为必填项</li>
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
          <el-table-column label="场景类型" prop="data.scenario_type" width="140" />
          <el-table-column label="发现日期" prop="data.discovery_date" width="110" />
          <el-table-column label="发现地点" prop="data.discovery_location" width="120" />
          <el-table-column label="资产名称" prop="data.asset_name" width="120" />
          <el-table-column label="资产品牌" prop="data.asset_brand" width="100" />
          <el-table-column label="资产规格型号" prop="data.asset_specification" width="120" />
          <el-table-column label="资产类型编码" prop="data.asset_type_code" width="120" />
          <el-table-column label="预估价值" prop="data.estimated_value" width="100" />
          <el-table-column label="关联资产编码" prop="data.related_asset_code" width="120" />
          <el-table-column label="目标仓库编码" prop="data.target_storage_code" width="120" />
          <el-table-column label="处理描述" prop="data.handle_description" show-overflow-tooltip />
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
export default { name: 'UnregisteredAssetBatchImport' }
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
import { useUnregisteredAssetStore } from '@/stores/unregisteredAssetStore'
import type { UnregisteredAssetCreateForm } from '@/utils/UnregisteredAsset'
import { ScenarioType } from '@/utils/UnregisteredAsset'
import type { BatchImportConfig } from '@/utils/batchImport/types'

// ===== Excel 行数据接口 =====
interface UnregisteredAssetExcelRow {
  scenario_type: string
  discovery_date: string
  discovery_location: string
  asset_name: string
  asset_brand?: string
  asset_specification?: string
  asset_type_code?: string
  estimated_value?: number | string
  related_asset_code?: string
  target_storage_code?: string
  handle_description?: string
}

// ===== 状态与实例 =====
const router = useRouter()
const unregisteredAssetStore = useUnregisteredAssetStore()
const fileList = ref<File[]>([])

// ===== 批量导入配置 =====
const importConfig: BatchImportConfig<UnregisteredAssetExcelRow, UnregisteredAssetCreateForm> = {
  entityName: '未登记资产',
  excelHeaderMap: {
    场景类型: 'scenario_type',
    发现日期: 'discovery_date',
    发现地点: 'discovery_location',
    资产名称: 'asset_name',
    资产品牌: 'asset_brand',
    资产规格型号: 'asset_specification',
    资产类型编码: 'asset_type_code',
    预估价值: 'estimated_value',
    关联资产编码: 'related_asset_code',
    目标仓库编码: 'target_storage_code',
    处理描述: 'handle_description',
  },
  requiredFields: ['scenario_type', 'discovery_date', 'discovery_location', 'asset_name'],
  validateItem: (item: UnregisteredAssetExcelRow) => {
    const errors: Record<string, string> = {}
    // 场景类型校验
    const validScenarios = [
      ScenarioType.S1_NO_RECORD,
      ScenarioType.S2_NO_OUTASSET,
      ScenarioType.S3_STATUS_MISMATCH,
    ]
    if (!item.scenario_type?.trim()) {
      errors.scenario_type = '场景类型不能为空'
    } else if (!validScenarios.includes(item.scenario_type.trim() as ScenarioType)) {
      errors.scenario_type =
        '场景类型非法，可选：s1_no_record / s2_no_outasset / s3_status_mismatch'
    }
    // 发现日期校验
    if (!item.discovery_date?.trim()) {
      errors.discovery_date = '发现日期不能为空'
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(item.discovery_date.trim())) {
      errors.discovery_date = '发现日期格式应为 YYYY-MM-DD'
    }
    // 发现地点校验
    if (!item.discovery_location?.trim()) {
      errors.discovery_location = '发现地点不能为空'
    }
    // 资产名称校验
    if (!item.asset_name?.trim()) {
      errors.asset_name = '资产名称不能为空'
    }
    // S2/S3 场景下关联资产编码必填
    if (
      (item.scenario_type === ScenarioType.S2_NO_OUTASSET ||
        item.scenario_type === ScenarioType.S3_STATUS_MISMATCH) &&
      !item.related_asset_code?.trim()
    ) {
      errors.related_asset_code = '当前场景下关联资产编码为必填项'
    }
    // 预估价值校验
    if (
      item.estimated_value !== undefined &&
      item.estimated_value !== null &&
      item.estimated_value !== ''
    ) {
      const value = Number(item.estimated_value)
      if (isNaN(value) || value < 0) {
        errors.estimated_value = '预估价值必须为非负数字'
      }
    }
    return { valid: Object.keys(errors).length === 0, errors }
  },
  transformToApiData: (row: UnregisteredAssetExcelRow): UnregisteredAssetCreateForm => ({
    scenario_type: row.scenario_type.trim(),
    discovery_date: row.discovery_date.trim(),
    discovery_location: row.discovery_location.trim(),
    asset_name: row.asset_name.trim(),
    asset_brand: row.asset_brand?.trim() || null,
    asset_specification: row.asset_specification?.trim() || null,
    asset_type_code: row.asset_type_code?.trim() || null,
    estimated_value:
      row.estimated_value !== undefined &&
      row.estimated_value !== null &&
      row.estimated_value !== ''
        ? Number(row.estimated_value)
        : null,
    related_asset_code: row.related_asset_code?.trim() || null,
    target_storage_code: row.target_storage_code?.trim() || null,
    handle_description: row.handle_description?.trim() || null,
  }),
  createFn: (data: UnregisteredAssetCreateForm) => unregisteredAssetStore.create(data),
  idField: 'asset_name',
  concurrency: 5,
}

const {
  previewData,
  validDataCount,
  isSubmitting,
  handleFileChange: _handleFileChange,
  submitBatchData,
  clearData,
} = useBatchImport<UnregisteredAssetExcelRow, UnregisteredAssetCreateForm>(importConfig)

const handleFileChange = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    _handleFileChange(uploadFile.raw)
  } else {
    ElMessage.error('文件读取失败，请重新选择')
  }
}

// ===== 验证状态标签 =====
const validationTagType = (row: ValidatedRow<UnregisteredAssetExcelRow>) => {
  if (row.submitStatus === 'error') return 'danger'
  if (row.submitStatus === 'success') return 'success'
  if (row.validationStatus === 'error') return 'danger'
  return 'success'
}

const validationTagText = (row: ValidatedRow<UnregisteredAssetExcelRow>) => {
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
      场景类型: 's1_no_record',
      发现日期: '2025-06-01',
      发现地点: '3号楼201室',
      资产名称: '联想ThinkPad笔记本',
      资产品牌: '联想',
      资产规格型号: 'ThinkPad T14',
      资产类型编码: 'HW-LAPTOP',
      预估价值: '5999.00',
      关联资产编码: '',
      目标仓库编码: 'STG001',
      处理描述: '盘点时发现未登记资产',
    }
    // 使用 ExcelJS 创建模板工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('未登记资产导入模板')

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
    link.download = '未登记资产批量导入模板.xlsx'
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
    headerName: '场景类型',
    field: 'scenario_type',
    required: true,
    example: 's1_no_record',
    remark: 's1_no_record/s2_no_outasset/s3_status_mismatch',
  },
  {
    headerName: '发现日期',
    field: 'discovery_date',
    required: true,
    example: '2025-06-01',
    remark: 'YYYY-MM-DD',
  },
  {
    headerName: '发现地点',
    field: 'discovery_location',
    required: true,
    example: '3号楼201室',
    remark: '资产发现的具体位置',
  },
  {
    headerName: '资产名称',
    field: 'asset_name',
    required: true,
    example: '联想ThinkPad笔记本',
    remark: '资产名称',
  },
  {
    headerName: '资产品牌',
    field: 'asset_brand',
    required: false,
    example: '联想',
    remark: '资产品牌（可选）',
  },
  {
    headerName: '资产规格型号',
    field: 'asset_specification',
    required: false,
    example: 'ThinkPad T14',
    remark: '规格型号（可选）',
  },
  {
    headerName: '资产类型编码',
    field: 'asset_type_code',
    required: false,
    example: 'HW-LAPTOP',
    remark: '关联资产类型编码（可选）',
  },
  {
    headerName: '预估价值',
    field: 'estimated_value',
    required: false,
    example: '5999.00',
    remark: '非负数字（可选）',
  },
  {
    headerName: '关联资产编码',
    field: 'related_asset_code',
    required: false,
    example: 'ASSET-001',
    remark: 'S2/S3场景必填',
  },
  {
    headerName: '目标仓库编码',
    field: 'target_storage_code',
    required: false,
    example: 'STG001',
    remark: '目标仓库编码（可选）',
  },
  {
    headerName: '处理描述',
    field: 'handle_description',
    required: false,
    example: '盘点时发现',
    remark: '处理描述（可选）',
  },
]

const exampleColumns = [
  { prop: 'scenario_type', label: '场景类型' },
  { prop: 'discovery_date', label: '发现日期' },
  { prop: 'discovery_location', label: '发现地点' },
  { prop: 'asset_name', label: '资产名称' },
  { prop: 'asset_brand', label: '资产品牌' },
  { prop: 'asset_specification', label: '资产规格型号' },
  { prop: 'asset_type_code', label: '资产类型编码' },
  { prop: 'estimated_value', label: '预估价值' },
  { prop: 'related_asset_code', label: '关联资产编码' },
  { prop: 'target_storage_code', label: '目标仓库编码' },
  { prop: 'handle_description', label: '处理描述' },
]

const exampleRows = [
  {
    scenario_type: 's1_no_record',
    discovery_date: '2025-06-01',
    discovery_location: '3号楼201室',
    asset_name: '联想ThinkPad笔记本',
    asset_brand: '联想',
    asset_specification: 'ThinkPad T14',
    asset_type_code: 'HW-LAPTOP',
    estimated_value: '5999.00',
    related_asset_code: '',
    target_storage_code: 'STG001',
    handle_description: '盘点时发现未登记资产',
  },
  {
    scenario_type: 's2_no_outasset',
    discovery_date: '2025-05-20',
    discovery_location: '5号楼会议室',
    asset_name: '戴尔显示器',
    asset_brand: '戴尔',
    asset_specification: 'U2722D',
    asset_type_code: 'HW-MONITOR',
    estimated_value: '3200.00',
    related_asset_code: 'ASSET-002',
    target_storage_code: 'STG002',
    handle_description: '有资产记录但无出库记录',
  },
]

// ===== 提交与清空 =====
const handleSubmit = async () => {
  const success = await submitBatchData()
  if (success) {
    unregisteredAssetStore.setRefreshFlag(true)
    ElMessage.success('未登记资产导入成功')
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
