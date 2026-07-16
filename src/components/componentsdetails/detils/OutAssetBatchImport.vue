<!--
  OutAssetBatchImport.vue
  出库资产批量导入页面
  功能：上传 Excel → 数据预览与验证 → 并发批量提交
  包含：导出模板 + 导入格式参考卡片（展示示例与规范）
-->
<template>
  <div class="batch-import">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>出库资产批量导入</span>
        </div>
      </template>

      <!-- 文件上传与模板导出区域 -->
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

      <!-- 导入格式参考卡片 -->
      <BatchImportGuideCard
        :header-examples="headerExamples"
        :example-rows="exampleRows"
        :example-columns="exampleColumns"
        :notices="[
          '出库资产编码、出库数量、出库日期为必填项',
          '资产状态可选值：in_use（使用中）/returned（已归还）/lost（丢失）/damaged（损坏）',
          '出库类型可选值：normal（正常出库）/scrap（报废出库）/transfer（调拨出库）',
          '日期格式统一为 YYYY-MM-DD，必填日期不可为空',
          'Excel 首行必须与「表头说明」中的中文列名完全一致',
          '导入前建议先「导出模板」，在模板基础上填写数据',
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
          <el-table-column label="出库资产编码" prop="data.outasset_code" width="150" />
          <el-table-column label="出库数量" prop="data.outasset_number" width="100" />
          <!-- [HR-01] 后端 v1.1.0 改为 read_only，移除申请人工号列 -->
          <!-- [HR-01] 后端 v1.1.0 改为 read_only，移除保管人工号列 -->
          <el-table-column label="出库日期" prop="data.outasset_date" width="110" />
          <el-table-column label="资产状态" prop="data.outasset_status" width="100" />
          <el-table-column label="出库类型" prop="data.outasset_type" width="100" />
          <!-- [HR-01] 后端 v1.1.0 改为 read_only，移除使用位置列 -->
          <el-table-column label="描述" prop="data.outasset_description" show-overflow-tooltip />
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
export default { name: 'OutAssetBatchImport' }
</script>

<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
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
import { outAssetAPI } from '@/api/outAsset'
import { useOutAssetStore } from '@/stores/outAssetStore'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import type { OutAssetCreateForm } from '@/utils/OutAsset'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import type { OutAssetExcelRow } from '@/types/batch-import'

const router = useRouter()
const outAssetStore = useOutAssetStore()
const fileList = ref<File[]>([])
const localIsSubmitting = ref(false)

// ===== 批量导入配置 =====
const importConfig: BatchImportConfig<OutAssetExcelRow, OutAssetCreateForm> = {
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
    const validStatuses = ['in_use', 'returned', 'lost', 'damaged']
    if (item.outasset_current_status && !validStatuses.includes(item.outasset_current_status)) {
      errors.outasset_current_status = '资产状态非法，可选：in_use / returned / lost / damaged'
    }

    const validTypes = ['normal', 'scrap', 'transfer']
    if (item.outasset_type && !validTypes.includes(item.outasset_type)) {
      errors.outasset_type = '出库类型非法，可选：normal / scrap / transfer'
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
    outasset_type: row.outasset_type?.trim() || 'normal',
    // [HR-01] 后端 v1.1.0 改为 read_only，移除 outasset_using_location
    outasset_description: row.outasset_description?.trim() || '', // 改为空字符串
  }),

  // placeholder: 实际提交逻辑在 handleSubmit 中直接调用 batchCreateOutAssets
  createFn: async () => ({}) as OutAssetCreateForm,
  idField: 'outasset_code',
}

// ===== 使用批量导入 Hook（仅用于 Excel 解析和数据验证）=====
const {
  previewData,
  validDataCount,
  handleFileChange: _handleFileChange,
  clearData,
} = useBatchImport<OutAssetExcelRow, OutAssetCreateForm>(importConfig)

/**
 * el-upload 的 on-change 回调参数为 UploadFile 对象
 * 需要从中提取 raw (File) 再传给 useBatchImport 的 handleFileChange
 */
const handleFileChange = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    _handleFileChange(uploadFile.raw)
  } else {
    ElMessage.error('文件读取失败，请重新选择')
  }
}

// ===== 导出模板 =====
const handleExportTemplate = async () => {
  try {
    const headers = Object.keys(importConfig.excelHeaderMap).filter(
      // 过滤掉辅助展示字段（非必填且不影响提交，但仍可包含在模板中）
      (h) => !['资产名称', '申请人姓名', '保管人姓名', '所属仓库'].includes(h),
    )
    const exampleRowData: Record<string, string> = {
      出库资产编码: 'OUT-001',
      出库数量: '1',
      // [HR-01] 后端 v1.1.0 改为 read_only，移除申请人工号示例
      // [HR-01] 后端 v1.1.0 改为 read_only，移除保管人工号示例
      资产状态: 'in_use',
      出库日期: '2025-06-01',
      预计返回日期: '2025-12-31',
      出库类型: 'normal',
      // [HR-01] 后端 v1.1.0 改为 read_only，移除使用位置示例
      资产描述: '用于项目测试',
      // 可选辅助列（推荐填写以便参考）
      资产名称: '服务器主机',
      申请人姓名: '张三',
      保管人姓名: '李四',
      所属仓库: '主仓库',
    }
    // 使用 ExcelJS 创建模板工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('出库资产导入模板')

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
    link.download = '出库资产批量导入模板.xlsx'
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

// ===== 导入格式参考卡片数据 =====
const headerExamples: HeaderExample[] = [
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
    example: 'normal',
    remark: 'normal/scrap/transfer',
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

const exampleColumns: ExampleColumn[] = [
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

const exampleRows = [
  {
    outasset_code: 'OUT-001',
    outasset_number: 1,
    // [HR-01] 后端 v1.1.0 改为 read_only，移除申请人工号
    // [HR-01] 后端 v1.1.0 改为 read_only，移除保管人工号
    outasset_date: '2025-06-01',
    outasset_status: 'in_use',
    outasset_type: 'normal',
    // [HR-01] 后端 v1.1.0 改为 read_only，移除使用位置
    outasset_description: '用于项目测试',
  },
  {
    outasset_code: 'OUT-002',
    outasset_number: 2,
    // [HR-01] 后端 v1.1.0 改为 read_only，移除申请人工号
    // [HR-01] 后端 v1.1.0 改为 read_only，移除保管人工号
    outasset_date: '2025-05-15',
    outasset_status: 'returned',
    outasset_type: 'transfer',
    // [HR-01] 后端 v1.1.0 改为 read_only，移除使用位置
    outasset_description: '临时调拨',
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

    const result = await outAssetAPI.batchCreateOutAssets(apiDataList)

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
      outAssetStore.setRefreshFlag(true)
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
// 统一使用与资产导入相同的样式（完全复用）
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
