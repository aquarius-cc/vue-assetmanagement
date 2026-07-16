<!--
  StorageBatchImport.vue
  仓库批量导入页面
  功能：上传 Excel → 数据预览与验证 → 批量提交
  后端接口：POST /api/assets/storages/batch-create/
-->
<template>
  <div class="batch-import">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>仓库批量导入</span>
        </div>
      </template>

      <!-- 文件上传与模板导出区域 -->
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

      <!-- 导入格式参考卡片 -->
      <BatchImportGuideCard
        :header-examples="headerExamples"
        :example-rows="exampleRows"
        :example-columns="exampleColumns"
        :notices="[
          '仓库编码长度 3-20 个字符，仓库名称长度 2-100 个字符',
          '「仓库类型」可选值：新货仓库 / 回收仓库 / 待报废仓库',
          'Excel 首行必须与「表头说明」中的中文列名完全一致',
        ]"
      />

      <!-- 数据预览表格 -->
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
          <el-table-column label="仓库编码" prop="data.storage_code" width="120" />
          <el-table-column label="仓库名称" prop="data.storage_name" min-width="120" />
          <el-table-column label="仓库地址" prop="data.storage_address" min-width="120" />
          <el-table-column label="仓库类型" prop="data.storage_type" width="100" />
          <el-table-column label="描述" prop="data.storage_description" show-overflow-tooltip />
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
export default { name: 'StorageBatchImport' }
</script>

<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useBatchImport } from '@/composables/useBatchImport'
import {
  validationTagType,
  validationTagText,
  type HeaderExample,
  type ExampleColumn,
} from '@/utils/batchImportHelpers'
import { exportImportTemplate } from '@/utils/exportImportTemplate'
import BatchImportGuideCard from '@/components/commoncomponents/BatchImportGuideCard.vue'
import { storageAPI } from '@/api/storage'
import { useStorageStore } from '@/stores/storageStore'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import type { StorageCreateForm } from '@/utils/Storage'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import type { StorageExcelRow } from '@/types/batch-import'

/**
 * 仓库类型值转换函数
 * 支持中文（新货仓库/回收仓库/待报废仓库）或英文（newasset/recycle/damaged）输入
 * 统一转换为英文枚举值
 */
const normalizeStorageType = (value: string | undefined): string => {
  const trimmed = value?.trim() ?? ''
  if (trimmed === '') return 'newasset'

  if (['newasset', 'recycle', 'damaged'].includes(trimmed)) {
    return trimmed
  }

  const map: Record<string, string> = {
    新货仓库: 'newasset',
    回收仓库: 'recycle',
    待报废仓库: 'damaged',
  }

  return map[trimmed] || 'newasset'
}

const router = useRouter()
const storageStore = useStorageStore()
const fileList = ref<File[]>([])
const localIsSubmitting = ref(false)

// ===== 批量导入配置 =====
const importConfig: BatchImportConfig<StorageExcelRow, StorageCreateForm> = {
  entityName: '仓库',

  excelHeaderMap: {
    仓库编码: 'storage_code',
    仓库名称: 'storage_name',
    仓库地址: 'storage_address',
    仓库类型: 'storage_type',
    仓库描述: 'storage_description',
  },

  requiredFields: ['storage_code', 'storage_name'],

  validateItem: (item) => {
    const errors: Record<string, string> = {}
    importConfig.requiredFields.forEach((field) => {
      const value = item[field]
      if (!value || (typeof value === 'string' && !value.trim())) {
        const labelMap: Record<string, string> = {
          storage_code: '仓库编码',
          storage_name: '仓库名称',
        }
        errors[field as string] = `${labelMap[field as string] || field} 不能为空`
      }
    })
    if (!errors.storage_code && item.storage_code) {
      if (item.storage_code.length < 3 || item.storage_code.length > 20) {
        errors.storage_code = '编码长度 3-20 个字符'
      }
    }
    if (!errors.storage_name && item.storage_name) {
      if (item.storage_name.length < 2 || item.storage_name.length > 100) {
        errors.storage_name = '名称长度 2-100 个字符'
      }
    }
    return { valid: Object.keys(errors).length === 0, errors }
  },

  transformToApiData: (row) => ({
    storage_code: row.storage_code.trim(),
    storage_name: row.storage_name.trim(),
    storage_address: row.storage_address?.trim() || '',
    storage_type: normalizeStorageType(row.storage_type),
    storage_description: row.storage_description?.trim() || '',
  }),

  // placeholder: 实际提交逻辑在 handleSubmit 中直接调用 batchCreateStorages
  createFn: async () => ({}) as StorageCreateForm,
  idField: 'storage_code',
}

// ===== 使用批量导入 Hook（仅用于 Excel 解析和数据验证）=====
const { previewData, validDataCount, handleFileChange, clearData } = useBatchImport<
  StorageExcelRow,
  StorageCreateForm
>(importConfig)

const handleUploadChange = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    handleFileChange(uploadFile.raw)
  } else {
    ElMessage.error('文件读取失败，请重新选择')
  }
}

// ===== 导出模板 =====
const handleExportTemplate = () =>
  exportImportTemplate({
    headers: Object.keys(importConfig.excelHeaderMap),
    exampleRowData: {
      仓库编码: 'WH-001',
      仓库名称: '新货主仓库',
      仓库地址: 'A栋1楼',
      仓库类型: '新货仓库',
      仓库描述: '用于存放新采购资产',
    },
    sheetName: '仓库导入模板',
    fileName: '仓库批量导入模板',
  })

// ===== 导入格式参考卡片数据 =====
const headerExamples: HeaderExample[] = [
  {
    headerName: '仓库编码',
    field: 'storage_code',
    required: true,
    example: 'WH-001',
    remark: '唯一编码，长度 3-20',
  },
  {
    headerName: '仓库名称',
    field: 'storage_name',
    required: true,
    example: '新货主仓库',
    remark: '长度 2-100,不允许出现重复的仓库名',
  },
  {
    headerName: '仓库地址',
    field: 'storage_address',
    required: false,
    example: 'A栋1楼',
    remark: '非必填',
  },
  {
    headerName: '仓库类型',
    field: 'storage_type',
    required: false,
    example: '新货仓库',
    remark: '新货仓库/回收仓库/待报废仓库',
  },
  {
    headerName: '仓库描述',
    field: 'storage_description',
    required: false,
    example: '用于存放新采购资产',
    remark: '非必填',
  },
]

const exampleColumns: ExampleColumn[] = [
  { prop: 'storage_code', label: '仓库编码' },
  { prop: 'storage_name', label: '仓库名称' },
  { prop: 'storage_address', label: '仓库地址' },
  { prop: 'storage_type', label: '仓库类型' },
  { prop: 'storage_description', label: '仓库描述' },
]

const exampleRows = [
  {
    storage_code: 'WH-001',
    storage_name: '新货主仓库',
    storage_address: 'A栋1楼',
    storage_type: '新货仓库',
    storage_description: '用于存放新采购资产',
  },
  {
    storage_code: 'WH-002',
    storage_name: '回收仓库',
    storage_address: 'B栋2楼',
    storage_type: '回收仓库',
    storage_description: '用于存放回收资产',
  },
]

// ===== 提交处理 =====
/**
 * 调用后端批量创建接口，一次性提交所有有效数据
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
    // console.log('提交数据:', apiDataList)
    const result = await storageAPI.batchCreateStorages(apiDataList)
    // console.log('批量创建仓库响应:', result)

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
      storageStore.setRefreshFlag(true)
    } else {
      ElMessage.warning(`导入完成：成功 ${result.success_count} 条，失败 ${result.fail_count} 条`)
    }
    router.go(-1)
  } catch (error) {
    const msg = extractErrorMessage(error)
    ElMessage.error(`导入失败：${msg}`)
  } finally {
    localIsSubmitting.value = false
  }
}

// ===== 清空数据 =====
const handleClear = () => {
  clearData()
  fileList.value = []
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
