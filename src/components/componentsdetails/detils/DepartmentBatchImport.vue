<!--
  DepartmentBatchImport.vue
  部门批量导入页面
  功能：上传 Excel → 数据预览与验证 → 并发批量提交
  包含：导出模板 + 导入格式参考卡片（展示示例与规范）
-->
<template>
  <div class="batch-import">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>部门批量导入</span>
        </div>
      </template>

      <!-- 文件上传与模板导出区域 -->
      <div class="upload-actions">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :on-change="handleFileUpload"
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
                    {{ row.required ? '是' : '否' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="example" label="示例值" />
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
              <li>部门编码为 2-20 位字母数字组合，不可重复</li>
              <li>部门名称长度 2-50 个字符，部门信息员为必填</li>
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
          <el-table-column label="部门编码" prop="data.department_code" width="150" />
          <el-table-column label="部门名称" prop="data.department_name" min-width="150" />
          <el-table-column label="部门信息员" prop="data.department_information" width="150" />
          <el-table-column label="错误信息" min-width="250" show-overflow-tooltip>
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
export default { name: 'DepartmentBatchImport' }
</script>

<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, InfoFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import ExcelJS from 'exceljs'
import { useBatchImport } from '@/composables/useBatchImport'
import type { ValidatedRow } from '@/composables/useBatchImport'
import { departmentAPI } from '@/api/department'
import { useDepartmentStore } from '@/stores/departmentStore'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import type { DepartmentCreateForm } from '@/utils/Department'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import type { DepartmentExcelRow } from '@/types/batch-import'

const router = useRouter()
const departmentStore = useDepartmentStore()
const fileList = ref<File[]>([])
const localIsSubmitting = ref(false)

// ===== 批量导入配置 =====
const importConfig: BatchImportConfig<DepartmentExcelRow, DepartmentCreateForm> = {
  entityName: '部门',

  // Excel 表头中文 -> 数据字段映射
  excelHeaderMap: {
    部门编码: 'department_code',
    部门名称: 'department_name',
    部门信息员: 'department_information',
  },

  // 必填字段
  requiredFields: ['department_code', 'department_name', 'department_information'],

  // 单条数据验证
  validateItem: (item: DepartmentExcelRow) => {
    const errors: Record<string, string> = {}

    if (!item.department_code?.trim()) {
      errors.department_code = '部门编码不能为空'
    } else if (!/^[A-Za-z0-9]{2,20}$/.test(item.department_code)) {
      errors.department_code = '部门编码格式不正确（2-20位字母数字组合）'
    }

    if (!item.department_name?.trim()) {
      errors.department_name = '部门名称不能为空'
    } else if (item.department_name.length < 2 || item.department_name.length > 50) {
      errors.department_name = '部门名称长度应在2-50个字符之间'
    }

    if (!item.department_information?.trim()) {
      errors.department_information = '部门信息员不能为空'
    }

    return { valid: Object.keys(errors).length === 0, errors }
  },

  // Excel 行 → API 提交数据
  transformToApiData: (row: DepartmentExcelRow): DepartmentCreateForm => ({
    department_code: row.department_code.trim(),
    department_name: row.department_name.trim(),
    department_information: row.department_information.trim(),
  }),

  // placeholder: 实际提交逻辑在 handleSubmit 中直接调用 batchCreateDepartments
  createFn: async () => ({}) as DepartmentCreateForm,
  idField: 'department_code',
}

// ===== 使用批量导入 Hook（仅用于 Excel 解析和数据验证）=====
const { previewData, validDataCount, handleFileChange, clearData } = useBatchImport<
  DepartmentExcelRow,
  DepartmentCreateForm
>(importConfig)

// ===== 验证状态标签辅助方法 =====
const validationTagType = (row: ValidatedRow<DepartmentExcelRow>) => {
  if (row.submitStatus === 'error') return 'danger'
  if (row.submitStatus === 'success') return 'success'
  if (row.validationStatus === 'error') return 'danger'
  return 'success'
}

const validationTagText = (row: ValidatedRow<DepartmentExcelRow>) => {
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
      部门编码: 'ITDEPT01',
      部门名称: '信息技术部',
      部门信息员: '张三',
    }
    // 使用 ExcelJS 创建模板工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('部门导入模板')

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
    link.download = '部门批量导入模板.xlsx'
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
const headerExamples = [
  {
    headerName: '部门编码',
    field: 'department_code',
    required: true,
    example: 'ITDEPT01',
    remark: '2-20位字母数字组合',
  },
  {
    headerName: '部门名称',
    field: 'department_name',
    required: true,
    example: '信息技术部',
    remark: '长度2-50',
  },
  {
    headerName: '部门信息员',
    field: 'department_information',
    required: true,
    example: '张三',
    remark: '必填',
  },
]

const exampleColumns = headerExamples.map((h) => ({ prop: h.field, label: h.headerName }))

const exampleRows = [
  {
    department_code: 'ITDEPT01',
    department_name: '信息技术部',
    department_information: '张三',
  },
  {
    department_code: 'HRDEPT02',
    department_name: '人力资源部',
    department_information: '李四',
  },
]

// ===== 文件上传处理（适配 el-upload 回调）=====
const handleFileUpload = (uploadFile: { raw: File }) => {
  clearData()
  fileList.value = []
  handleFileChange(uploadFile.raw)
}

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

    const result = await departmentAPI.batchCreateDepartments(apiDataList)

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
      departmentStore.setRefreshFlag(true)
      setTimeout(() => {
        router.push('/main/departmentdetails')
      }, 1500)
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
