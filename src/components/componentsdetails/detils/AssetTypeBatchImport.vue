<template>
  <div class="batch-import">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>资产分类批量导入</span>
        </div>
      </template>

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
            <div class="section-title">必填列说明</div>
            <el-table :data="headerExamples" border size="small" style="width: 100%">
              <el-table-column prop="headerName" label="Excel 表头（中文）" width="160" />
              <el-table-column prop="field" label="对应字段" width="180" />
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
            <div class="section-title">示例数据（参考填写）</div>
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
            <div class="section-title">注意事项</div>
            <ul class="notice-list">
              <li>编码长度 3-30 个字符，名称长度 2-100 个字符</li>
              <li>「层级」为数字，顶级分类填 0，子级依次递增（最大 6 层）</li>
              <li>「父级编码」填写父级类型的 recordcode，顶级分类留空</li>
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
          <el-table-column label="类型编码" prop="data.type_code" width="120" />
          <el-table-column label="类型名称" prop="data.type_name" min-width="120" />
          <el-table-column label="父级编码" prop="data.parent_type_code" width="120" />
          <el-table-column label="层级" prop="data.level" width="60" />
          <el-table-column label="描述" prop="data.type_description" show-overflow-tooltip />
          <el-table-column label="错误信息" min-width="180" show-overflow-tooltip>
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
export default { name: 'AssetTypeBatchImport' }
</script>

<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { isAxiosError } from 'axios'
import { Upload, InfoFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import ExcelJS from 'exceljs'
import { useBatchImport } from '@/composables/useBatchImport'
import type { ValidatedRow } from '@/composables/useBatchImport'
import { assetTypeAPI } from '@/api/assetType'
import { useAssetTypeStore } from '@/stores/assetTypeStore'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import type { AssetTypeCreateForm } from '@/utils/AssetType'
import type { BatchImportConfig } from '@/utils/batchImport/types'

interface AssetTypeExcelRow {
  type_code: string
  type_name: string
  parent_type_code?: string
  level?: string
  type_description?: string
  sort_order?: string
}

const router = useRouter()
const assetTypeStore = useAssetTypeStore()
const fileList = ref<File[]>([])
const localIsSubmitting = ref(false)

const importConfig: BatchImportConfig<AssetTypeExcelRow, AssetTypeCreateForm> = {
  entityName: '资产分类',

  excelHeaderMap: {
    类型编码: 'type_code',
    类型名称: 'type_name',
    父级编码: 'parent_type_code',
    层级: 'level',
    类型描述: 'type_description',
    排序: 'sort_order',
  },

  requiredFields: ['type_code', 'type_name'],

  validateItem: (item) => {
    const errors: Record<string, string> = {}
    importConfig.requiredFields.forEach((field) => {
      const value = item[field]
      if (!value || (typeof value === 'string' && !value.trim())) {
        const labelMap: Record<string, string> = {
          type_code: '类型编码',
          type_name: '类型名称',
        }
        errors[field as string] = `${labelMap[field as string] || field} 不能为空`
      }
    })
    if (!errors.type_code && item.type_code) {
      if (item.type_code.length < 3 || item.type_code.length > 30) {
        errors.type_code = '编码长度 3-30 个字符'
      }
    }
    if (!errors.type_name && item.type_name) {
      if (item.type_name.length < 2 || item.type_name.length > 100) {
        errors.type_name = '名称长度 2-100 个字符'
      }
    }
    return { valid: Object.keys(errors).length === 0, errors }
  },

  transformToApiData: (row) => ({
    type_code: row.type_code.trim(),
    type_name: row.type_name.trim(),
    parent_type_code: row.parent_type_code?.trim() || null,
    level: row.level ? parseInt(row.level, 10) : 0,
    type_description: row.type_description?.trim() || '',
    sort_order: row.sort_order ? parseInt(row.sort_order, 10) : 0,
  }),

  createFn: async () => ({}) as AssetTypeCreateForm,
  idField: 'type_code',
}

const { previewData, validDataCount, handleFileChange, clearData } = useBatchImport(importConfig)

const handleUploadChange = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    handleFileChange(uploadFile.raw)
  } else {
    ElMessage.error('文件读取失败，请重新选择')
  }
}

const validationTagType = (row: ValidatedRow<AssetTypeExcelRow>) => {
  if (row.submitStatus === 'error') return 'danger'
  if (row.submitStatus === 'success') return 'success'
  if (row.validationStatus === 'error') return 'danger'
  return 'success'
}

const validationTagText = (row: ValidatedRow<AssetTypeExcelRow>) => {
  if (row.submitStatus === 'error') return '提交失败'
  if (row.submitStatus === 'success') return '已提交'
  if (row.validationStatus === 'error') return '验证失败'
  return '有效'
}

const handleExportTemplate = async () => {
  try {
    const headers = Object.keys(importConfig.excelHeaderMap)
    const exampleRow: Record<string, string> = {
      类型编码: 'TYPE-001',
      类型名称: '电子设备',
      父级编码: '',
      层级: '0',
      类型描述: '电子设备类资产',
      排序: '1',
    }
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('资产分类导入模板')

    worksheet.addRow(headers)
    worksheet.addRow(headers.map((h) => exampleRow[h] ?? ''))

    worksheet.columns = headers.map(() => ({ width: 20 }))

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '资产分类批量导入模板.xlsx'
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

const headerExamples = [
  {
    headerName: '类型编码',
    field: 'type_code',
    required: true,
    example: 'TYPE-001',
    remark: '唯一编码，长度 3-30',
  },
  {
    headerName: '类型名称',
    field: 'type_name',
    required: true,
    example: '电子设备',
    remark: '长度 2-100',
  },
  {
    headerName: '父级编码',
    field: 'parent_type_code',
    required: false,
    example: '',
    remark: '父级类型业务编码，顶级留空',
  },
  {
    headerName: '层级',
    field: 'level',
    required: false,
    example: '0',
    remark: '顶级为 0，最大 6 层',
  },
  {
    headerName: '类型描述',
    field: 'type_description',
    required: false,
    example: '电子设备类资产',
    remark: '非必填，补充说明',
  },
  {
    headerName: '排序',
    field: 'sort_order',
    required: false,
    example: '1',
    remark: '数字越小越靠前',
  },
]

const exampleColumns = [
  { prop: 'type_code', label: '类型编码' },
  { prop: 'type_name', label: '类型名称' },
  { prop: 'parent_type_code', label: '父级编码' },
  { prop: 'level', label: '层级' },
  { prop: 'type_description', label: '类型描述' },
  { prop: 'sort_order', label: '排序' },
]

const exampleRows = [
  {
    type_code: 'TYPE-001',
    type_name: '电子设备',
    parent_type_code: '',
    level: '0',
    type_description: '电子设备类资产',
    sort_order: '1',
  },
  {
    type_code: 'TYPE-002',
    type_name: '服务器',
    parent_type_code: 'TYPE-001',
    level: '1',
    type_description: '服务器类电子设备',
    sort_order: '1',
  },
]

const handleSubmit = async () => {
  if (validDataCount.value === 0) {
    ElMessage.warning('没有有效数据可提交')
    return
  }

  localIsSubmitting.value = true
  try {
    const validRows = previewData.value.filter((r) => r.validationStatus === 'success')
    const apiDataList = validRows.map((r) =>
      importConfig.transformToApiData(r.data as AssetTypeExcelRow),
    )

    previewData.value.forEach((row) => {
      row.submitStatus = undefined
      row.submitError = undefined
    })

    // 前端预检：检查 type_code 和 type_name 是否在本批次内重复
    const codeCount = new Map<string, number>()
    const nameCount = new Map<string, number>()
    apiDataList.forEach((item) => {
      codeCount.set(item.type_code, (codeCount.get(item.type_code) || 0) + 1)
      nameCount.set(item.type_name, (nameCount.get(item.type_name) || 0) + 1)
    })
    const localErrors: string[] = []
    codeCount.forEach((count, code) => {
      if (count > 1) localErrors.push(`类型编码「${code}」在本批次中重复 ${count} 次`)
    })
    nameCount.forEach((count, name) => {
      if (count > 1) localErrors.push(`类型名称「${name}」在本批次中重复 ${count} 次`)
    })
    if (localErrors.length > 0) {
      ElMessage.warning(`本批次数据存在重复：${localErrors.join('；')}`)
      // 标记重复行
      const seenCodes = new Set<string>()
      const seenNames = new Set<string>()
      validRows.forEach((row, idx) => {
        const item = apiDataList[idx]
        const errs: string[] = []
        if (codeCount.get(item.type_code)! > 1) {
          if (seenCodes.has(item.type_code)) errs.push(`类型编码「${item.type_code}」重复`)
          seenCodes.add(item.type_code)
        }
        if (nameCount.get(item.type_name)! > 1) {
          if (seenNames.has(item.type_name)) errs.push(`类型名称「${item.type_name}」重复`)
          seenNames.add(item.type_name)
        }
        if (errs.length > 0) {
          row.submitStatus = 'error'
          row.submitError = errs.join('；')
        }
      })
      localIsSubmitting.value = false
      return
    }

    const result = await assetTypeAPI.batchCreateAssetTypes(apiDataList)

    // 场景1: 200 响应，后端逐条处理返回 fail_items
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
      assetTypeStore.setRefreshFlag(true)
      router.go(-1)
    } else {
      ElMessage.warning(`导入完成：成功 ${result.success_count} 条，失败 ${result.fail_count} 条`)
    }
  } catch (error: unknown) {
    // 场景2: 400 响应（序列化器校验失败），提取逐条错误信息显示到表格
    const axiosErr = isAxiosError(error) ? error : null
    const responseData = axiosErr?.response?.data as Record<string, unknown> | undefined
    const errData = responseData?.data as Record<string, unknown> | undefined
    const items = errData?.items as Array<Record<string, string[]>> | undefined

    if (items && Array.isArray(items)) {
      const validRows = previewData.value.filter((r) => r.validationStatus === 'success')
      items.forEach((itemErrors, idx) => {
        if (idx < validRows.length && itemErrors && Object.keys(itemErrors).length > 0) {
          const messages = Object.entries(itemErrors)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
            .join('；')
          validRows[idx].submitStatus = 'error'
          validRows[idx].submitError = messages
        }
      })
      ElMessage.warning(`导入完成：部分数据校验失败，请查看错误信息`)
    } else {
      const msg = extractErrorMessage(error)
      ElMessage.error(`导入失败：${msg}`)
    }
  } finally {
    localIsSubmitting.value = false
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
