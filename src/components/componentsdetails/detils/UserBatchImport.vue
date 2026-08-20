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
import {
  validationTagType,
  validationTagText,
  type HeaderExample,
  type ExampleColumn,
} from '@/utils/batchImportHelpers'
import BatchImportGuideCard from '@/components/commoncomponents/BatchImportGuideCard.vue'
import type { ExcelEmployeeData, EmployeeCreateForm } from '@/types/user'

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

// ===== 批量导入配置（完全类型安全）=====
const batchConfig = {
  entityName: '员工',
  // ✅ 必须列为 Excel 表头的中文键
  requiredFields: ['姓名', '工号', '电话', '位置', '部门', '排序'] as (keyof ExcelEmployeeData)[],
  excelHeaderMap: {
    姓名: '姓名',
    工号: '工号',
    电话: '电话',
    位置: '位置',
    状态: '状态',
    部门代码: '部门代码',
    部门: '部门',
    描述: '描述',
    排序: '排序',
  } as const,

  /** 校验单条 Excel 行 */
  validateItem(item: ExcelEmployeeData) {
    const errors: Record<string, string> = {}
    const VALID_STATUS_INPUTS = Object.keys(USER_STATUS_INPUT_MAPPING)

    // 清洗字段
    const name = String(item.姓名 ?? '').trim()
    const jobcode = String(item.工号 ?? '').trim()
    const phone = String(item.电话 ?? '').trim()
    const location = String(item.位置 ?? '').trim()
    const statusInput = String(item.状态 ?? '').trim()
    const departmentName = String(item.部门 ?? '').trim()
    const sort = Number(item.排序 ?? 0)

    // 必填校验
    if (!name) errors.姓名 = '姓名为必填项'
    if (!jobcode) {
      errors.工号 = '工号为必填项'
    } else if (!/^[A-Z][0-9]{5}$/.test(jobcode)) {
      errors.工号 = '工号格式不正确（如 A12345）'
    }
    if (!phone) {
      errors.电话 = '电话为必填项'
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      errors.电话 = '电话格式不正确'
    }
    if (!location) errors.位置 = '位置为必填项'
    if (!departmentName) {
      errors.部门 = '部门名称为必填项'
    } else {
      // 检查部门名称是否可解析（与 transformToApiData 逻辑一致）
      const mapping = reverseDepartmentMapping.value
      const hasExactMatch = !!mapping[departmentName]
      const hasTrimMatch = Object.keys(mapping).some((name) => name.trim() === departmentName)
      const hasFuzzyMatch = Object.keys(mapping).some(
        (name) => name.includes(departmentName) || departmentName.includes(name),
      )
      const hasCodeColumn = !!String(item.部门代码 ?? '').trim()
      if (!hasExactMatch && !hasTrimMatch && !hasFuzzyMatch && !hasCodeColumn) {
        errors.部门 = '部门名称在系统中不存在，且「部门代码」列也为空'
      }
    }
    if (isNaN(sort)) errors.排序 = '排序必须是数字'
    if (sort < 0) errors.排序 = '排序不能小于 0'
    if (sort > 1000000) errors.排序 = '排序不能大于 1000000'

    // 状态值映射（可选字段，不存在则使用默认值 active）
    if (statusInput) {
      const mapped = USER_STATUS_INPUT_MAPPING[statusInput]
      if (!mapped) {
        errors.状态 = `状态值无效，有效值：${VALID_STATUS_INPUTS.join('、')}`
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    }
  },

  /**
   * 转换为 API 提交格式（EmployeeCreateForm）
   * 注意：这里只转换通过校验的行，但即使部分数据有误，我们仍返回一个合法的 EmployeeCreateForm 对象，
   * 因为提交时只会提交 valid 行。
   */
  transformToApiData(item: ExcelEmployeeData): EmployeeCreateForm {
    const departmentName = String(item.部门 ?? '').trim()
    const statusInput = String(item.状态 ?? '').trim()
    const sort = Number(item.排序 ?? 0)
    const normalizedStatus = statusInput
      ? ((USER_STATUS_INPUT_MAPPING[statusInput] || 'active') as 'active' | 'left' | 'retirement')
      : 'active'

    // 部门代码解析：精确匹配 → trim 后匹配 → 模糊匹配 → 回退到部门代码列
    let departmentCode = ''
    if (departmentName) {
      // 1. 精确匹配
      departmentCode = reverseDepartmentMapping.value[departmentName] || ''
      // 2. trim 后再匹配
      if (!departmentCode) {
        const entries = Object.entries(reverseDepartmentMapping.value)
        const match = entries.find(([name]) => name.trim() === departmentName)
        if (match) departmentCode = match[1]
      }
      // 3. 模糊匹配（部门名称包含 Excel 中的值，或 Excel 中的值包含部门名称）
      if (!departmentCode) {
        const entries = Object.entries(reverseDepartmentMapping.value)
        const match = entries.find(
          ([name]) => name.includes(departmentName) || departmentName.includes(name),
        )
        if (match) departmentCode = match[1]
      }
    }
    // 4. 回退到「部门代码」列
    if (!departmentCode) {
      departmentCode = String(item.部门代码 ?? '').trim()
    }

    return {
      employee_jobcode: String(item.工号 ?? '').trim(),
      employee_name: String(item.姓名 ?? '').trim(),
      employee_phone: String(item.电话 ?? '').trim(),
      employee_location: String(item.位置 ?? '').trim(),
      employee_status: normalizedStatus,
      employee_department_code: departmentCode || '',
      employee_description: String(item.描述 ?? '').trim() || null,
      sort_order: sort,
    }
  },

  /** placeholder: 实际提交逻辑在 submitBatchData 中直接调用 batchCreateUsers */
  createFn: async () => ({}) as EmployeeCreateForm,

  idField: 'employee_jobcode' as const, // ✅ 对应 EmployeeCreateForm 的键
}

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

// ===== 导入格式参考卡片数据 =====
const headerExamples: HeaderExample[] = [
  {
    headerName: '姓名',
    field: 'employee_name',
    required: true,
    example: '张三',
    remark: '员工姓名，2-20个字符',
  },
  {
    headerName: '工号',
    field: 'employee_jobcode',
    required: true,
    example: 'A12345',
    remark: '1位大写字母+5位数字，不可重复',
  },
  {
    headerName: '电话',
    field: 'employee_phone',
    required: true,
    example: '13812345678',
    remark: '11位手机号码',
  },
  {
    headerName: '位置',
    field: 'employee_location',
    required: true,
    example: '铁机路B栋14楼',
    remark: '员工所在位置',
  },
  {
    headerName: '部门',
    field: 'employee_department',
    required: true,
    example: '信息管理中心',
    remark: '部门名称，优先于部门代码',
  },
  {
    headerName: '状态',
    field: 'employee_status',
    required: false,
    example: 'active',
    remark: 'active/left/retirement，默认active',
  },
  {
    headerName: '部门代码',
    field: 'employee_department_code',
    required: false,
    example: 'XXGLZX',
    remark: '可选，部门名称优先',
  },
  {
    headerName: '排序',
    field: 'sort_order',
    required: false,
    example: '100',
    remark: '排序顺序，默认0',
  },
  {
    headerName: '描述',
    field: 'employee_description',
    required: false,
    example: '负责资产管理系统维护',
    remark: '员工描述信息',
  },
]

const exampleColumns: ExampleColumn[] = headerExamples.map((h) => ({
  prop: h.field,
  label: h.headerName,
}))

const exampleRows = [
  {
    employee_name: '张三',
    employee_jobcode: 'A12345',
    employee_phone: '13812345678',
    employee_location: '铁机路B栋14楼',
    employee_department: '信息管理中心',
    sort_order: 100,
    employee_status: 'active',
    employee_department_code: 'XXGLZX',
    employee_description: '信息管理中心员工，负责资产管理系统维护',
  },
  {
    employee_name: '李四',
    employee_jobcode: 'B67890',
    employee_phone: '13987654321',
    employee_location: '铁机路B栋13楼',
    employee_department: '人力资源部',
    sort_order: 200,
    employee_status: 'active',
    employee_department_code: 'RLZYB',
    employee_description: '人力资源部主管',
  },
]

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
  const templateData: ExcelEmployeeData[] = [
    {
      姓名: '张三',
      工号: 'A12345',
      状态: 'active(在职)/left(离职)/retirement(退休)',
      电话: '13812345678',
      排序: 100,
      位置: '铁机路B栋14楼',
      部门代码: 'XXGLZX(请根据实际部门代码填写，可参考部门列表或不填写)',
      部门: '信息管理中心(XXGLZX, 部门与部门代码相对应，请填写正确的部门名称)',
      描述: '信息管理中心员工，负责资产管理系统维护',
    },
  ]

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

<style lang="scss" scoped>
// 使用公共样式 mixin（与 OutAssetForm 保持一致）
@use '@/assets/styles/common-forms.scss' as *;

.batch-import-container {
  // 继承公共表单容器样式
  @include form-container;

  // 卡片头部返回按钮
  .back-btn {
    margin-left: auto;
  }

  // 导入卡片（继承 box-card 样式）
  .import-card {
    max-width: 1200px;
    margin: 0 auto;
  }

  // 上传区域
  .upload-section {
    margin-bottom: 24px;

    .template-btn {
      margin-left: 20px;
    }
  }

  // 数据预览区域
  .preview-section {
    margin-top: 24px;

    .section-title {
      color: $text-primary;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--color-primary-light);
    }

    // 分页
    .pagination-wrapper {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
    }

    // 操作按钮
    .action-buttons {
      margin-top: 20px;
      display: flex;
      gap: 12px;
      justify-content: center;
    }
  }

  // 错误文本
  .error-text {
    color: var(--color-danger-light);
    font-size: 13px;
  }
}
</style>
