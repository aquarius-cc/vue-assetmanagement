<!--
  AssetTypeBatchImport.vue
  资产分类批量导入页面
  功能：上传 Excel → 数据预览与验证 → 并发批量提交
  新增：导出模板 + 导入格式参考卡片（展示示例与规范）
-->
<template>
  <div class="batch-import">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>资产分类批量导入</span>
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

      <!-- 新增：导入格式参考卡片（模拟图片区域） -->
      <div class="import-guide-card">
        <div class="guide-header">
          <el-icon><InfoFilled /></el-icon>
          <span>导入格式参考</span>
        </div>
        <div class="guide-content">
          <!-- 表头说明 -->
          <div class="guide-section">
            <div class="section-title">📌 必填列说明</div>
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
          <!-- 示例数据（模拟图片中的示例行） -->
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
              <li>编码长度 3-50 个字符，名称长度 2-100 个字符</li>
              <li>「资产分类类型」可选值：硬件 / 软件 / 其他（默认 other）</li>
              <li>Excel 首行必须与「表头说明」中的中文列名完全一致</li>
              <li>导入前建议先「导出模板」，在模板基础上填写数据</li>
            </ul>
          </div>
        </div>
      </div>

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
          <el-table-column label="分类编码" prop="data.asset_type_code" width="120" />
          <el-table-column label="一级分类" prop="data.asset_type_primary" min-width="120" />
          <el-table-column label="二级分类" prop="data.asset_type_secondary" min-width="120" />
          <el-table-column label="类型" prop="data.asset_type_category" width="80" />
          <el-table-column label="描述" prop="data.asset_type_description" show-overflow-tooltip />
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
export default { name: 'AssetTypeBatchImport' }
</script>

<script lang="ts" setup>
// ===== 导入顺序：Vue 核心 → 第三方库 → @/ 内部模块 =====
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
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

/**
 * 资产分类类型值转换函数
 * 支持中文（硬件/软件/其他）或英文（hardware/software/other）输入
 * 统一转换为英文枚举值
 * @param value 输入值（中文或英文）
 * @returns 英文枚举值（hardware/software/other）
 */
const normalizeAssetTypeCategory = (value: string | undefined): string => {
  const trimmed = value?.trim() ?? ''
  if (trimmed === '') return 'other'

  // 已经是英文，直接返回
  if (['hardware', 'software', 'lowvalue', 'other'].includes(trimmed)) {
    return trimmed
  }

  // 中文映射
  const map: Record<string, string> = {
    硬件: 'hardware',
    软件: 'software',
    低值易耗: 'lowvalue',
    其他: 'other',
  }

  return map[trimmed] || 'other'
}

// ===== Excel 行数据类型 =====
interface AssetTypeExcelRow {
  asset_type_code: string
  asset_type_primary: string
  asset_type_secondary: string
  asset_type_category?: string
  asset_type_description?: string
}

const router = useRouter()
const assetTypeStore = useAssetTypeStore()
const fileList = ref<File[]>([])
const localIsSubmitting = ref(false)

// ===== 批量导入配置（仅用于 Excel 解析和数据验证）=====
const importConfig: BatchImportConfig<AssetTypeExcelRow, AssetTypeCreateForm> = {
  entityName: '资产分类',

  // Excel 表头中文 -> 数据字段映射
  excelHeaderMap: {
    资产分类编码: 'asset_type_code',
    一级分类名称: 'asset_type_primary',
    二级分类名称: 'asset_type_secondary',
    资产分类类型: 'asset_type_category',
    资产分类描述: 'asset_type_description',
  },

  // 必填字段（用于验证）
  requiredFields: ['asset_type_code', 'asset_type_primary', 'asset_type_secondary'],

  // 单条数据验证
  validateItem: (item) => {
    const errors: Record<string, string> = {}
    importConfig.requiredFields.forEach((field) => {
      const value = item[field]
      if (!value || (typeof value === 'string' && !value.trim())) {
        const labelMap: Record<string, string> = {
          asset_type_code: '资产分类编码',
          asset_type_primary: '一级分类名称',
          asset_type_secondary: '二级分类名称',
        }
        errors[field as string] = `${labelMap[field as string] || field} 不能为空`
      }
    })
    if (!errors.asset_type_code && item.asset_type_code) {
      if (item.asset_type_code.length < 3 || item.asset_type_code.length > 50) {
        errors.asset_type_code = '编码长度 3-50 个字符'
      }
    }
    if (!errors.asset_type_primary && item.asset_type_primary) {
      if (item.asset_type_primary.length < 2 || item.asset_type_primary.length > 100) {
        errors.asset_type_primary = '名称长度 2-100 个字符'
      }
    }
    if (!errors.asset_type_secondary && item.asset_type_secondary) {
      if (item.asset_type_secondary.length < 2 || item.asset_type_secondary.length > 100) {
        errors.asset_type_secondary = '名称长度 2-100 个字符'
      }
    }
    return { valid: Object.keys(errors).length === 0, errors }
  },

  // Excel 行 → API 提交数据
  transformToApiData: (row) => ({
    asset_type_code: row.asset_type_code.trim(),
    asset_type_primary: row.asset_type_primary.trim(),
    asset_type_secondary: row.asset_type_secondary.trim(),
    // 资产分类类型转换：支持中文（硬件/软件/其他）或英文（hardware/software/other）
    asset_type_category: normalizeAssetTypeCategory(row.asset_type_category),
    asset_type_description: row.asset_type_description?.trim() || '',
  }),

  // placeholder: 实际提交逻辑在 handleSubmit 中直接调用 batchCreateAssetTypes
  createFn: async () => ({}) as AssetTypeCreateForm,
  idField: 'asset_type_code',
}

// ===== 使用批量导入 Hook（仅用于 Excel 解析和数据验证）=====
const { previewData, validDataCount, handleFileChange, clearData } = useBatchImport(importConfig)

/**
 * el-upload 的 on-change 回调参数为 UploadFile 对象
 * 需要从中提取 raw (File) 再传给 useBatchImport 的 handleFileChange
 */
const handleUploadChange = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    handleFileChange(uploadFile.raw)
  } else {
    ElMessage.error('文件读取失败，请重新选择')
  }
}

// ===== 验证状态标签辅助方法 =====
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

// ===== 导出模板（原有功能）=====
/**
 * 导出 Excel 模板文件，表头与导入期望完全一致
 * 包含一行示例数据，方便用户理解格式
 */
const handleExportTemplate = async () => {
  try {
    const headers = Object.keys(importConfig.excelHeaderMap)
    const exampleRow: Record<string, string> = {
      资产分类编码: 'AST-001',
      一级分类名称: '电子设备',
      二级分类名称: '服务器',
      资产分类类型: '硬件',
      资产分类描述: '数据中心用服务器',
    }
    // 使用 ExcelJS 创建模板工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('资产分类导入模板')

    // 添加表头行和示例数据行
    worksheet.addRow(headers)
    worksheet.addRow(headers.map((h) => exampleRow[h] ?? ''))

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

// ===== 新增：导入格式参考卡片的数据 =====
/** 表头说明表格数据 */
const headerExamples = [
  {
    headerName: '资产分类编码',
    field: 'asset_type_code',
    required: true,
    example: 'AST-001',
    remark: '唯一编码，长度 3-50',
  },
  {
    headerName: '一级分类名称',
    field: 'asset_type_primary',
    required: true,
    example: '电子设备',
    remark: '长度 2-100',
  },
  {
    headerName: '二级分类名称',
    field: 'asset_type_secondary',
    required: true,
    example: '服务器',
    remark: '长度 2-100',
  },
  {
    headerName: '资产分类类型',
    field: 'asset_type_category',
    required: false,
    example: '硬件',
    remark: '硬件/软件/低值易耗/其他，默认硬件',
  },
  {
    headerName: '资产分类描述',
    field: 'asset_type_description',
    required: false,
    example: '数据中心用服务器',
    remark: '非必填，补充说明',
  },
]

/** 示例数据表格的列配置 */
const exampleColumns = [
  { prop: 'asset_type_code', label: '资产分类编码' },
  { prop: 'asset_type_primary', label: '一级分类名称' },
  { prop: 'asset_type_secondary', label: '二级分类名称' },
  { prop: 'asset_type_category', label: '资产分类类型' },
  { prop: 'asset_type_description', label: '资产分类描述' },
]

/** 示例数据行（展示一条完整示例） */
const exampleRows = [
  {
    asset_type_code: 'AST-001',
    asset_type_primary: '电子设备',
    asset_type_secondary: '服务器',
    asset_type_category: '硬件',
    asset_type_description: '数据中心用服务器',
  },
  {
    asset_type_code: 'AST-002',
    asset_type_primary: '办公家具',
    asset_type_secondary: '办公椅',
    asset_type_category: '其他',
    asset_type_description: '人体工学椅',
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
    // 获取验证通过的数据并转换为 API 格式
    const validRows = previewData.value.filter((r) => r.validationStatus === 'success')
    const apiDataList = validRows.map((r) =>
      importConfig.transformToApiData(r.data as AssetTypeExcelRow),
    )

    // 重置提交状态
    previewData.value.forEach((row) => {
      row.submitStatus = undefined
      row.submitError = undefined
    })

    // 调用后端批量创建接口
    const result = await assetTypeAPI.batchCreateAssetTypes(apiDataList)

    // 根据后端返回的失败项标记预览数据
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
      // 全部成功
      validRows.forEach((row) => {
        row.submitStatus = 'success'
      })
    }

    // 提示结果
    if (result.fail_count === 0) {
      ElMessage.success(`全部导入成功！共 ${result.success_count} 条`)
      // 通知父页面刷新数据
      assetTypeStore.setRefreshFlag(true)
      // 导入全部成功后跳转回列表页
      router.go(-1)
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

  /* 新增：导入格式参考卡片样式（模拟图片区域） */
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
