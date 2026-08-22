<!--
  UserBatchImport.vue
  员工批量导入页面
  功能：上传 Excel → 数据预览与验证 → 并发批量提交
  包含：导出模板 + 导入格式参考卡片（展示示例与规范）+ 分页展示
-->
<template>
  <div class="batch-import-container">
    <el-card class="import-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>批量导入员工</span>
          <el-button class="back-btn" type="primary" @click="$router.go(-1)">返回</el-button>
        </div>
      </template>

      <!-- 文件上传区域 -->
      <div class="upload-section">
        <el-upload
          ref="uploadRef"
          class="upload-demo"
          action=""
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleFileChange"
          accept=".xlsx,.xls"
        >
          <el-button type="primary">
            <el-icon><Upload /></el-icon>
            选择Excel文件
          </el-button>
          <template #tip>
            <div class="el-upload__tip">
              支持 .xlsx, .xls
              格式文件，请确保Excel文件包含以下列：姓名、工号、电话、位置、状态、部门代码、描述
            </div>
          </template>
        </el-upload>

        <!-- 下载模板按钮 -->
        <el-button link @click="downloadTemplate" class="template-btn">
          <el-icon><Download /></el-icon>
          下载导入模板
        </el-button>
      </div>

      <!-- 导入格式参考卡片 -->
      <BatchImportGuideCard
        :header-examples="headerExamples"
        :example-rows="exampleRows"
        :example-columns="exampleColumns"
        :notices="[
          '工号格式为 1 位大写字母 + 5 位数字（如 A12345），不可重复',
          '状态可选值：active(在职)、left(离职)、retirement(退休)，不填默认为 active',
          '部门名称优先于部门代码，系统会根据部门名称自动匹配部门代码',
          '电话格式为 11 位手机号码',
          'Excel 首行必须与「表头说明」中的中文列名完全一致',
          '导入前建议先「导出模板」，在模板基础上填写数据',
        ]"
      />

      <!-- 数据预览表格 -->
      <div v-if="displayRows.length > 0" class="preview-section">
        <h3 class="section-title">
          数据预览 (共 {{ displayRows.length }} 条，有效 {{ validDataCount }} 条)
        </h3>
        <el-table :data="paginatedData" border stripe max-height="500">
          <!-- 验证状态列 -->
          <el-table-column label="验证" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="validationTagType(row)" size="small">
                {{ validationTagText(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="姓名" prop="employee_name" min-width="100" />
          <el-table-column label="工号" prop="employee_jobcode" min-width="100" />
          <el-table-column label="状态" prop="employee_status" min-width="80">
            <template #default="scope">
              <span>{{
                USER_STATUS_INPUT_MAPPING[scope.row.employee_status] || scope.row.employee_status
              }}</span>
            </template>
          </el-table-column>
          <el-table-column label="电话" prop="employee_phone" min-width="120" />
          <el-table-column label="位置" prop="employee_location" min-width="120" />
          <el-table-column label="部门代码" prop="employee_department_code" min-width="100" />
          <el-table-column label="部门" prop="employee_department_name" min-width="150" />
          <el-table-column
            label="描述"
            prop="employee_description"
            min-width="150"
            show-overflow-tooltip
          />
          <!-- 错误信息列 -->
          <el-table-column label="错误信息" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.validationStatus === 'error'" class="error-text">
                {{ row.validationError }}
              </span>
              <span v-else-if="row.submitStatus === 'error'" class="error-text">
                {{ row.submitError || '提交失败' }}
              </span>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="displayRows.length"
            layout="total, sizes, prev, pager, next, jumper"
            background
          />
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <el-button @click="clearData">清空数据</el-button>
          <el-button
            type="success"
            :loading="localIsSubmitting"
            :disabled="validDataCount === 0"
            @click="submitBatchData"
          >
            提交有效数据 ({{ validDataCount }})
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>



<script lang="ts" setup>
defineOptions({ name: 'UserBatchImport' })

import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Download } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { userAPI } from '@/api/user'
import { useUserStore } from '@/stores/userStore'
import { useDepartmentStore } from '@/stores/index'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import { USER_STATUS_INPUT_MAPPING } from '@/utils/Format'
import ExcelJS from 'exceljs'
import { useBatchImport } from '@/composables/useBatchImport'
import { validationTagType, validationTagText } from '@/utils/batchImportHelpers'
import BatchImportGuideCard from '@/components/commoncomponents/BatchImportGuideCard.vue'
import type { ExcelEmployeeData } from '@/types/user'
import {
  createUserBatchConfig,
  userHeaderExamples as headerExamples,
  userExampleColumns as exampleColumns,
  userExampleRows as exampleRows,
  userTemplateData,
} from './userBatchImport.config'

const router = useRouter()
const userStore = useUserStore()
const departmentStore = useDepartmentStore()
const uploadRef = ref()
const localIsSubmitting = ref(false)

// ✅ 优化：部门名称→代码映射使用 computed，自动响应 departmentStore 数据变化
const reverseDepartmentMapping = computed<Record<string, string>>(() => {
  const mapping: Record<string, string> = {}
  for (const dept of departmentStore.list) {
    if (dept.department_name && dept.department_code) {
      mapping[dept.department_name] = dept.department_code
    }
  }
  return mapping
})

// ✅ 批量导入配置（工厂函数创建，部门映射以 getter 注入保持响应性，DR-5 物理提取）
const batchConfig = createUserBatchConfig(() => reverseDepartmentMapping.value)

// ✅ 使用通用批量导入 composable（仅用于 Excel 解析和数据验证）
const {
  previewData,
  validDataCount,
  handleFileChange: _handleFileChange,
  clearData: _clearData,
} = useBatchImport(batchConfig)

// ===== 分页相关 =====
const currentPage = ref(1)
const pageSize = ref(10)

// 分页后的数据
const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return displayRows.value.slice(start, end)
})

// ✅ 包装文件处理（Element Plus 的 on-change 参数为 { raw: File }）
const handleFileChange = (file: { raw: File }) => {
  _handleFileChange(file.raw)
  // 重置分页到第一页
  currentPage.value = 1
}

// ✅ 用于表格显示的数据，补充部门名称以供展示
const displayRows = computed(() =>
  previewData.value.map((row) => {
    const apiData = batchConfig.transformToApiData(row.data)
    return {
      ...apiData,
      employee_department_name: row.data.部门 ?? '', // 保留原始部门名称显示
      validationStatus: row.validationStatus,
      validationError: row.validationErrorSummary,
    }
  }),
)

// ✅ 提交确认与跳转：调用后端批量创建接口
const submitBatchData = async () => {
  if (validDataCount.value === 0) {
    ElMessage.warning('没有有效数据可提交')
    return
  }
  try {
    await ElMessageBox.confirm(`确认导入 ${validDataCount.value} 条记录吗？`, '确认导入', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    localIsSubmitting.value = true
    try {
      const validRows = previewData.value.filter((r) => r.validationStatus === 'success')
      const apiDataList = validRows.map((r) => batchConfig.transformToApiData(r.data))

      previewData.value.forEach((row) => {
        row.submitStatus = undefined
        row.submitError = undefined
      })

      const result = await userAPI.batchCreateUsers(apiDataList)

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
        ElMessage.success(`成功导入 ${result.success_count} 条记录`)
        // 通知父页面刷新数据
        userStore.setRefreshFlag(true)
        setTimeout(() => router.push('/main/departmentmanagement'), 2000)
      } else {
        ElMessage.warning(`导入完成：成功 ${result.success_count} 条，失败 ${result.fail_count} 条`)
      }
    } finally {
      localIsSubmitting.value = false
    }
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      ElMessage.info('导入操作已取消')
      return
    }
    const msg = extractErrorMessage(error)
    console.error('批量导入失败:', error)
    ElMessage.error(`导入失败：${msg}`)
  }
}
// 清空数据和上传组件
const clearData = () => {
  _clearData()
  uploadRef.value?.clearFiles()
}

// 下载模板（使用 ExcelJS）
const downloadTemplate = async () => {
  const templateData = userTemplateData

  // 使用 ExcelJS 创建模板
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('员工导入模板')

  // 添加表头
  const headers = Object.keys(templateData[0])
  worksheet.addRow(headers)

  // 添加数据行
  templateData.forEach((row) => {
    worksheet.addRow(headers.map((h) => row[h as keyof ExcelEmployeeData]))
  })

  // 生成并下载文件
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '员工批量导入模板.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 确保部门数据已加载（保证映射可用）
onMounted(async () => {
  if (departmentStore.list.length === 0) {
    await departmentStore.getList()
  }
})
</script>

<style lang="scss" scoped src="./UserBatchImport.scss"></style>