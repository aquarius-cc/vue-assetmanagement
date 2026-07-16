<!--
  AssetBatchImport.vue
  资产批量导入页面（已按规范优化）

  后端规则变更说明：
  - asset_code 由后端自动生成，前端无需传递
  - asset_purchase_number > 1 时，后端创建多条 Asset 记录
  - 返回 List[AssetDetail]，统一数组格式（单条时长度为1）
  - 编码格式：ASSET-{asset_type_category}-{type_code}-{YYYYMMDD}-{random}-{seq}

  功能：上传Excel的数据预览与验证，支持并发批量提交
  包含：导出模板 + 导入格式参考卡 + 解析错误提示 + 预览分页
-->
<template>
  <div class="batch-import">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>资产批量导入</span>
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
            <div class="upload-tip">仅支持 .xlsx / .xls，首行为表头（中文列名）</div>
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
      <!-- 数据预览表格 -->
      <div v-if="previewData.length > 0" class="preview-table">
        <h3 class="section-title">
          数据预览 ({{ previewData.length }} 条，有效 {{ validDataCount }} 条)
        </h3>
        <el-table :data="paginatedPreviewData" border stripe max-height="500">
          <el-table-column label="验证" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="validationTagType(row)" size="small">
                {{ validationTagText(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <!-- 资产编码：后端自动生成，预览中仅展示（如果有） -->
          <el-table-column label="资产编码（自动生成）" width="140">
            <template #default="{ row }">
              <span class="auto-generate-hint">{{ row.data.asset_code || '系统自动生成' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="资产名称" prop="data.asset_name" min-width="120" />
          <el-table-column label="规格型号" prop="data.asset_specification" min-width="100" />
          <el-table-column label="单价" prop="data.asset_purchase_price" width="100" />
          <el-table-column label="采购数量" prop="data.asset_purchase_number" width="100" />
          <el-table-column label="入库日期" prop="data.asset_entry_date" width="110" />
          <el-table-column label="资产分类编码" prop="data.asset_type" width="120" />
          <el-table-column label="合同编码" prop="data.asset_contract" width="120" />
          <el-table-column label="错误信息" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.validationStatus === 'error'" class="error-text">
                {{ extractErrorMessage(row.validationErrorSummary) }}
              </span>
              <span v-else-if="row.submitStatus === 'error'" class="error-text">
                {{ extractErrorMessage(row.submitError) }}
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
      <!-- 导入格式参考卡 -->
      <BatchImportGuideCard
        :header-examples="headerExamples"
        :example-rows="exampleRows"
        :example-columns="exampleColumns"
        :notices="[
          '资产编码由系统自动生成，Excel 中可留空，无需填写',
          '资产名称长度 2-100 个字符，必填',
          '规格型号、单价、采购数量、入库日期、资产分类编码为必填',
          '单价和采购数量必须为有效数字，采购日期和入库日期格式为：YYYY-MM-DD',
          '新旧状态可选值：newly / used / damaged / waste',
          '当前状态可选值：in_store / in_use / in_scrapped',
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
          提交有效数据 ({{ validDataCount }} 条)
        </el-button>
        <el-button @click="handleClear">清空</el-button>
        <el-button type="info" @click="goBack">返回</el-button>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts">
export default { name: 'AssetBatchImport' }
</script>

<script lang="ts" setup>
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
import { request } from '@/api/index'
import { useAssetStore } from '@/stores/assetStore'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import { isAxiosError } from 'axios'
import type { AssetCreateForm } from '@/types/asset'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import type { AssetExcelRow } from '@/types/batch-import'

const router = useRouter()
const assetStore = useAssetStore()

// 上传组件 ref 和文件列表状态
const uploadRef = ref<UploadInstance>()
const fileList = ref<UploadFile[]>([])
const localIsSubmitting = ref(false)

// ===== 预览表格分页状?=====
const previewPageSize = 10
const currentPreviewPage = ref(1)

// ===== 批量导入配置（对应AssetCreateForm） =====
const importConfig: BatchImportConfig<AssetExcelRow, AssetCreateForm> = {
  entityName: '资产',
  // Excel 表头中文 -> 数据字段映射
  excelHeaderMap: {
    资产编码: 'asset_code',
    资产名称: 'asset_name',
    规格型号: 'asset_specification',
    品牌: 'asset_brand',
    单位: 'asset_unit',
    单价: 'asset_purchase_price',
    采购数量: 'asset_purchase_number',
    采购日期: 'asset_purchase_date',
    质保期: 'asset_warranty_period',
    入库日期: 'asset_entry_date',
    当前状态: 'asset_current_status',
    资产分类编码: 'asset_type',
    录入人工: 'asset_entry_person',
    合同编码: 'asset_contract',
    申请人工: 'asset_applicant',
    保管人工: 'asset_manager',
    使用地点: 'asset_using_location',
    仓库编码: 'asset_storage',
    资产描述: 'asset_description',
  },
  // 必填字段（基?AssetCreateForm 必需字段?）
  // 注意：asset_code 已改为后端自动生成，不再是必填字?）
  requiredFields: [
    'asset_name',
    'asset_specification',
    'asset_purchase_price',
    'asset_purchase_number',
    'asset_entry_date',
    'asset_type',
    'asset_current_status',
  ],
  // 单条数据验证
  validateItem: (item: AssetExcelRow) => {
    const errors: Record<string, string> = {}

    // ?asset_code 改为可选（后端自动生成），移除必填校验和长度校?    // if (!item.asset_code?.toString().trim()) {
    //   errors.asset_code = '资产编码不能为空'
    // } else if (item.asset_code.length < 3 || item.asset_code.length > 50) {
    //   errors.asset_code = '编码长度 3-50 个字?
    // }

    if (!item.asset_name?.trim()) {
      errors.asset_name = '资产名称不能为空'
    } else if (item.asset_name.length < 2 || item.asset_name.length > 100) {
      errors.asset_name = '名称长度 2-100 个字符'
    }

    if (!item.asset_specification?.trim()) {
      errors.asset_specification = '规格型号不能为空'
    }

    // 单价校验
    const price = Number(item.asset_purchase_price)
    if (isNaN(price) || price < 0) {
      errors.asset_purchase_price = '单价必须是有效数字且不小?'
    }

    // 采购数量校验
    const quantity = Number(item.asset_purchase_number)
    if (isNaN(quantity) || !Number.isInteger(quantity) || quantity < 1) {
      errors.asset_purchase_number = '采购数量必须是正整数'
    }

    // 入库日期格式
    if (item.asset_entry_date && !/^\d{4}-\d{2}-\d{2}$/.test(item.asset_entry_date)) {
      errors.asset_entry_date = '入库日期格式应为 YYYY-MM-DD'
    }

    if (!item.asset_type?.trim()) {
      errors.asset_type = '资产分类编码不能为空'
    }

    // 可选字段校验（如果有值）
    if (item.asset_purchase_date && !/^\d{4}-\d{2}-\d{2}$/.test(item.asset_purchase_date)) {
      errors.asset_purchase_date = '采购日期格式应为 YYYY-MM-DD'
    }

    if (item.asset_warranty_period) {
      const period = Number(item.asset_warranty_period)
      if (isNaN(period) || period < 0) {
        errors.asset_warranty_period = '质保期必须是有效数字'
      }
    }

    const validStatuses = ['in_store', 'recycled_pending', 'in_use', 'damaged', 'scrapped']
    if (item.asset_current_status && !validStatuses.includes(item.asset_current_status)) {
      errors.asset_current_status =
        '当前状态值非法，可选：in_store / recycled_pending / in_use / damaged / scrapped'
    }

    return { valid: Object.keys(errors).length === 0, errors }
  },

  // Excel 表格数据转换为 API 提交格式
  // 后端规则变更：asset_code 由后端自动生成，前端不再传递
  transformToApiData: (row: AssetExcelRow): AssetCreateForm => ({
    asset_name: row.asset_name.trim(),
    asset_specification: row.asset_specification.trim(),
    asset_brand: row.asset_brand?.trim() || null,
    asset_unit: row.asset_unit?.trim() || null,
    asset_purchase_price: String(Number(row.asset_purchase_price)),
    asset_purchase_number: Number(row.asset_purchase_number),
    asset_purchase_date: row.asset_purchase_date?.trim() || null,
    asset_warranty_period: row.asset_warranty_period ? Number(row.asset_warranty_period) : null,
    asset_entry_date: row.asset_entry_date.trim(),
    asset_type: row.asset_type.trim(),
    asset_entry_person: row.asset_entry_person?.trim() || null,
    asset_contract: row.asset_contract?.trim() || null,
    asset_applicant: row.asset_applicant?.trim() || null,
    asset_manager: row.asset_manager?.trim() || null,
    asset_using_location: row.asset_using_location?.trim() || null,
    asset_storage: row.asset_storage?.trim() || null,
    asset_description: row.asset_description?.trim() || null,
  }),

  // placeholder: 实际提交逻辑?handleSubmit 中直接调?batchCreateAssets
  createFn: async () => ({}) as AssetCreateForm,
  // 注意：后端规则变更：asset_code 由后端自动生成，不再作为前端唯一标识
  // 使用 asset_name 作为追踪字段（批量导入时用于标识提交状态）
  idField: 'asset_name',
} as const

// ===== 使用批量导入 Hook（仅用于 Excel 解析和数据验证）=====
// 注意：从 useBatchImport 获取原始的 handleFileChange（它期望原生 File 对象)
const {
  previewData,
  validDataCount,
  parseError, // 新增
  handleFileChange: rawHandleFileChange,
  clearData,
} = useBatchImport<AssetExcelRow, AssetCreateForm>(importConfig)

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

// ===== 适配 el-upload ?onChange 事件 =====
/**
 * 将 el-upload 的 UploadFile 对象适配为原生 File 对象 * 再调用批量导入 Hook 的 handleFileChange
 * @param uploadFile - el-upload 提供的文件对象 @param uploadFileList - 当前文件列表（用于更新组件状态）
 */
const handleUploadChange = async (uploadFile: UploadFile, uploadFileList: UploadFile[]) => {
  // 更新本地文件列表，用于界面显示
  fileList.value = uploadFileList

  // 获取原始 File 对象（关键修复点）
  const rawFile = uploadFile.raw
  if (!rawFile) {
    ElMessage.warning('无法读取文件，请重新选择')
    return
  }

  // 调用批量导入的核心处理函数
  await rawHandleFileChange(rawFile)
  // 分页重置
  resetPreviewPage()
}

// ===== 分页页码改变 =====
const handlePreviewPageChange = (page: number) => {
  currentPreviewPage.value = page
}

// ===== 导出模板 =====
const handleExportTemplate = async () => {
  try {
    const headers = Object.keys(importConfig.excelHeaderMap)
    // 注意：后端规则变更：asset_code 由后端自动生成，模板中示例留空
    const exampleRowData: Record<string, string> = {
      资产编码: '', // 留空，后端自动生成
      资产名称: '服务器主机',
      规格型号: 'Dell R750',
      品牌: '戴尔',
      单位: '台',
      单价: '35000',
      采购数量: '2',
      采购日期: '2025-01-10',
      质保年限: '3',
      入库日期: '2025-01-15',
      新旧状态: 'newly',
      当前状态: 'in_store',
      资产分类编码: 'SVR-01',
      录入人工号: 'EMP001',
      合同编码: 'CT-2025-001',
      申请人工号: 'EMP002',
      保管人工号: 'EMP003',
      使用地点: '数据中心A',
      仓库编码: 'WH-01',
      资产描述: '主节点服务器',
      使用记录: '待分配',
    }
    // 使用 ExcelJS 创建模板工作簿
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('资产导入模板')

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
    link.download = '资产批量导入模板.xlsx'
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

// ===== 导入格式参考卡片数据（基于正确字段）=====
// 注意：后端规则变更：asset_code 由后端自动生成，Excel 中无需填写
const headerExamples: HeaderExample[] = [
  {
    headerName: '资产编码',
    field: 'asset_code',
    required: false, // 改为非必填
    example: '（留空）',
    remark: '系统自动生成，无需填写',
  },
  {
    headerName: '资产名称',
    field: 'asset_name',
    required: true,
    example: '服务器主机',
    remark: '长度2-100',
  },
  {
    headerName: '规格型号',
    field: 'asset_specification',
    required: true,
    example: 'Dell R750',
    remark: '必填',
  },
  { headerName: '品牌', field: 'asset_brand', required: false, example: '戴尔', remark: '非必填' },
  { headerName: '单位', field: 'asset_unit', required: false, example: '台', remark: '非必填' },
  {
    headerName: '单价',
    field: 'asset_purchase_price',
    required: true,
    example: '35000',
    remark: '数字，≥0',
  },
  {
    headerName: '采购数量',
    field: 'asset_purchase_number',
    required: true,
    example: '2',
    remark: '正整数',
  },
  {
    headerName: '采购日期',
    field: 'asset_purchase_date',
    required: false,
    example: '2025-01-10',
    remark: 'YYYY-MM-DD',
  },
  {
    headerName: '质保??',
    field: 'asset_warranty_period',
    required: false,
    example: '3',
    remark: '数字，≥0',
  },
  {
    headerName: '入库日期',
    field: 'asset_entry_date',
    required: true,
    example: '2025-01-15',
    remark: 'YYYY-MM-DD',
  },
  {
    headerName: '当前状态',
    field: 'asset_current_status',
    required: false,
    example: 'in_store',
    remark: 'in_store/recycled_pending/in_use/damaged/scrapped',
  },
  {
    headerName: '资产分类编码',
    field: 'asset_type_code',
    required: true,
    example: 'SVR-01',
    remark: '关联资产分类',
  },
  {
    headerName: '录入人工号',
    field: 'asset_entry_person_jobcode',
    required: false,
    example: 'EMP001',
    remark: '员工工号',
  },
  {
    headerName: '合同编码',
    field: 'asset_contract_code',
    required: true,
    example: 'CT-2025-001',
    remark: '关联合同',
  },
  {
    headerName: '申请人工号',
    field: 'asset_applicant_jobcode',
    required: false,
    example: 'EMP002',
    remark: '员工工号',
  },
  {
    headerName: '保管人工号',
    field: 'asset_manager_jobcode',
    required: false,
    example: 'EMP003',
    remark: '员工工号',
  },
  {
    headerName: '使用地点',
    field: 'asset_using_location',
    required: false,
    example: '数据中心A',
    remark: '非必填',
  },
  {
    headerName: '仓库编码',
    field: 'asset_storage_code',
    required: true,
    example: 'WH-01',
    remark: '关联仓库',
  },
  {
    headerName: '资产描述',
    field: 'asset_description',
    required: false,
    example: '主节点服务器',
    remark: '非必填',
  },
]

const exampleColumns: ExampleColumn[] = headerExamples.map((h) => ({
  prop: h.field,
  label: h.headerName,
}))

// 注意：后端规则变更：asset_code 由后端自动生成，示例数据中可为空
const exampleRows = [
  {
    asset_code: '', // 留空，后端自动生成    asset_name: '服务器主机',
    asset_specification: 'Dell R750',
    asset_brand: '戴尔',
    asset_unit: '台',
    asset_purchase_price: 35000,
    asset_purchase_number: 2,
    asset_purchase_date: '2025-01-10',
    asset_warranty_period: 3,
    asset_entry_date: '2025-01-15',
    asset_current_status: 'in_store',
    asset_type_code: 'SVR-01',
    asset_entry_person_jobcode: 'EMP001',
    asset_contract_code: 'CT-2025-001',
    asset_applicant_jobcode: 'EMP002',
    asset_manager_jobcode: 'EMP003',
    asset_using_location: '数据中心A',
    asset_storage_code: 'WH-01',
    asset_description: '主节点服务器',
  },
  {
    asset_code: '', // 留空，后端自动生成    asset_name: '办公椅',
    asset_specification: '人体工学',
    asset_brand: 'Herman Miller',
    asset_unit: '台',
    asset_purchase_price: 2800,
    asset_purchase_number: 10,
    asset_purchase_date: '2024-12-20',
    asset_warranty_period: 2,
    asset_entry_date: '2024-12-25',
    asset_current_status: 'in_store',
    asset_type_code: 'FUR-01',
    asset_entry_person_jobcode: 'EMP004',
    asset_contract_code: '',
    asset_applicant_jobcode: 'EMP005',
    asset_manager_jobcode: 'EMP006',
    asset_using_location: '办公区B',
    asset_storage_code: 'WH-02',
    asset_description: '人体工学办公椅',
  },
]

/**
 * 提交处理：调用后端批量创建接口，一次性提交所有有效数? * 解决原有逐条创建因并发请求去重导致的数据丢失问题
 */
const handleSubmit = async () => {
  const validRows = previewData.value.filter((r) => r.validationStatus === 'success')
  if (validRows.length === 0) {
    ElMessage.warning('没有有效数据可提交')
    return
  }

  localIsSubmitting.value = true
  try {
    // 转换为 API 格式
    const apiDataList = validRows.map((r) => importConfig.transformToApiData(r.data))

    // 重置提交状态
    previewData.value.forEach((row) => {
      row.submitStatus = undefined
      row.submitError = undefined
    })

    // 调用后端批量创建接口（直接用 request.post 避免 unwrapResponse 丢失详细错误）
    let result: {
      total: number
      success_count: number
      fail_count: number
      success_items: unknown[]
      fail_items: Array<{ index: number; error_message: string }>
    }
    try {
      const res = await request.post('/assets/assets/batch-create/', { items: apiDataList })
      const respData = res.data as Record<string, unknown>
      result = {
        total: respData.total as number,
        success_count: respData.success_count as number,
        fail_count: respData.fail_count as number,
        success_items: respData.success_items as unknown[],
        fail_items: respData.fail_items as Array<{ index: number; error_message: string }>,
      }
    } catch (axiosError: unknown) {
      // 处理 400 错误：后端返?{ code: 400, data: { items: [{ field: ["错误"] }] } }
      if (isAxiosError(axiosError) && axiosError.response?.status === 400) {
        const respData = axiosError.response.data as Record<string, unknown>
        // console.log('后端返回错误数据:', respData)
        const detailItems = (respData?.data as Record<string, unknown>)?.items as
          | Array<Record<string, string[]>>
          | undefined
        // console.log('后端返回错误数据 items:', detailItems)
        if (detailItems && Array.isArray(detailItems)) {
          // 将每条item 的字段错误合并为一条错误信息
          const failedMap = new Map<number, string>()
          detailItems.forEach((itemErrors, idx) => {
            const messages = Object.values(itemErrors).flat()
            if (messages.length > 0) {
              failedMap.set(idx, messages.join(''))
            }
          })
          // console.log('合并后的detailItems:', detailItems)
          validRows.forEach((row, idx) => {
            if (failedMap.has(idx)) {
              row.submitStatus = 'error'
              row.submitError = failedMap.get(idx) || '验证失败'
            } else {
              row.submitStatus = 'success'
            }
          })
          ElMessage.warning(`导入完成：部分数据验证失败，请查看错误详情`)
          return
        }
      }
      // 其他错误：抛出让外层 catch 处理
      throw axiosError
    }

    // 处理 200 响应中的 fail_count（逐条处理时的失败项）
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
      router.go(-1)
    }

    if (result.fail_count === 0) {
      ElMessage.success(`全部导入成功！共 ${result.success_count} 条`)
      // 通知父页面刷新数据
      assetStore.setRefreshFlag(true)
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

// ===== 清空数据（同时重置上传组件状态） =====
const handleClear = () => {
  clearData() // 清除预览数据和提交结?  fileList.value = [] // 清空本地文件列表
  uploadRef.value?.clearFiles() // 清空 el-upload 组件内部的文件列表  resetPreviewPage() // 分页重置到第一页  ElMessage.info('已清空所有数?)
}

// ===== 返回上一?=====
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
