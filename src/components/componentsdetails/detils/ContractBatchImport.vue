<!--
  ContractBatchImport.vue
  合同批量导入页面
  功能：上传 Excel → 数据预览与验证 → 并发批量提交
  包含：导出模板 + 导入格式参考卡片（展示示例与规范）
  遵守 AGENTS 规范：
  - 使用组合式 API + TypeScript 严格模式
  - 样式隔离 scoped
  - 禁止 any 类型
  - 单向数据流：通过 useBatchImport 封装业务逻辑
  - 全量使用 @/ 别名导入
-->
<template>
  <div class="batch-import">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <el-icon><Upload /></el-icon>
          <span>合同批量导入</span>
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
            <div class="upload-tip">仅支持 .xlsx / .xls 文件，首行为表头（中文列名）</div>
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
      <!-- 数据预览表格 （使用分页数据）-->
      <div v-if="previewData.length > 0" class="preview-table">
        <h3 class="section-title">
          数据预览 ({{ previewData.length }} 条，有效 {{ validDataCount }} 条)
        </h3>
        <el-table :data="paginatedPreviewData" border stripe max-height="500">
          <el-table-column label="验证结果" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="validationTagType(row)" size="small">
                {{ validationTagText(row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="合同编码" prop="data.contract_code" width="150" />
          <el-table-column label="合同名称" prop="data.contract_name" min-width="200" />
          <el-table-column label="供应商" prop="data.supplier_name" width="150" />
          <el-table-column label="合同金额" prop="data.contract_amount" width="120" />
          <el-table-column label="签订日期" prop="data.contract_start_date" width="110" />
          <el-table-column label="合同类型" prop="data.contract_type" width="120" />
          <el-table-column label="合同状态" prop="data.contract_status" width="100" />
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
      <!-- 导入格式参考卡片 -->
      <BatchImportGuideCard
        :header-examples="headerExamples"
        :example-rows="exampleRows"
        :example-columns="exampleColumns"
        :notices="[
          '合同编码、合同名称、供应商、合同价格、签订日期、合同类型、保修期、结算状态为必填项',
          '合同类型可选值：purchase / service / information_construction / direct_procurement',
          '结算状态可选值：pending / settled',
          '日期格式统一为YYYY-MM-DD，签订日期不可为空，初验/终验日期可为空',
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
          提交有效数据 ({{ validDataCount }})
        </el-button>
        <el-button @click="handleClear">清空</el-button>
        <el-button type="info" @click="goBack">返回</el-button>
      </div>
    </el-card>
  </div>
</template>



<script lang="ts" setup>
defineOptions({ name: 'ContractBatchImport' })

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useBatchImport } from '@/composables/useBatchImport'
import { usePreviewPagination } from '@/composables/usePreviewPagination'
import { validationTagType, validationTagText } from '@/utils/batchImportHelpers'
import BatchImportGuideCard from '@/components/commoncomponents/BatchImportGuideCard.vue'
import { downloadExcelTemplate } from '@/utils/batchImport/templateExport'
import {
  contractImportConfig as importConfig,
  contractHeaderExamples as headerExamples,
  contractExampleColumns as exampleColumns,
  contractExampleRows as exampleRows,
} from './contractBatchImport.config'
import { contractAPI } from '@/api/contract'
import { useContractStore } from '@/stores/contractStore'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import type { ContractCreateForm } from '@/types/contract'
import type { ContractExcelRow } from '@/types/batch-import'

const router = useRouter()
const contractStore = useContractStore()

// 上传组件 ref 和文件列表状态
const uploadRef = ref<UploadInstance>()
const fileList = ref<UploadFile[]>([])
const localIsSubmitting = ref(false)

// 注意：从 useBatchImport 获取原始的 handleFileChange（它期望原生 File 对象）
const {
  previewData,
  validDataCount,
  parseError, // 新增
  handleFileChange: rawHandleFileChange,
  clearData,
} = useBatchImport<ContractExcelRow, ContractCreateForm>(importConfig)

// ===== 预览表格分页（公共组合式函数，DR-1 收敛）=====
const { previewPageSize, currentPreviewPage, paginatedPreviewData, resetPreviewPage, handlePreviewPageChange } =
  usePreviewPagination(previewData)

// ===== 适配 el-upload onChange 事件 =====
const handleUploadChange = async (uploadFile: UploadFile, uploadFileList: UploadFile[]) => {
  fileList.value = uploadFileList
  const rawFile = uploadFile.raw
  if (!rawFile) {
    ElMessage.warning('无法读取文件，请重新选择')
    return
  }
  // 调用批量导入的核心处理函数（内部会设置 parseError 和 previewData）
  await rawHandleFileChange(rawFile)
  // 文件解析完成后重置分页到第一行
  resetPreviewPage() // 新文件加载后重置页码
}

// ===== 导出模板（公共工具函数，DR-1 收敛）=====
const handleExportTemplate = async () => {
  const headers = Object.keys(importConfig.excelHeaderMap)
  const exampleRowData: Record<string, string> = {
    合同编码: 'CT-2025-001',
    合同名称: '服务器采购合同',
    供应商: 'XX科技有限公司',
    合同金额: '100000',
    签订日期: '2025-01-15',
    合同类型: 'tender_procurement',
    保修期: '3',
    初验日期: '2025-02-01',
    终验日期: '2025-06-30',
    合同状态: 'purchasing',
    结算价格: '50000',
    已付金额: '50000',
  }
  await downloadExcelTemplate('合同导入模板', headers, [exampleRowData], '合同批量导入模板.xlsx')
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

    const result = await contractAPI.batchCreateContracts(apiDataList)

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
      contractStore.setRefreshFlag(true)
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

// ===== 清空数据 （同时重置上传组件状态和分页）====
const handleClear = () => {
  clearData()
  fileList.value = []
  uploadRef.value?.clearFiles()
  resetPreviewPage()
  ElMessage.info('已清空所有数据')
}

// ===== 返回上一页 =====
const goBack = () => {
  router.go(-1)
}
</script>

<style scoped lang="scss" src="./ContractBatchImport.scss"></style>
