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
          '当前状态可选值：in_store / recycled_pending / in_use / damaged / scrapped',
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



<script lang="ts" setup>
defineOptions({ name: 'AssetBatchImport' })

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useBatchImport } from '@/composables/useBatchImport'
import { usePreviewPagination } from '@/composables/usePreviewPagination'
import { validationTagType, validationTagText } from '@/utils/batchImportHelpers'
import BatchImportGuideCard from '@/components/commoncomponents/BatchImportGuideCard.vue'
import { request } from '@/api/index'
import { useAssetStore } from '@/stores/assetStore'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import { isAxiosError } from 'axios'
import { downloadExcelTemplate } from '@/utils/batchImport/templateExport'
import type { AssetExcelRow } from '@/types/batch-import'
import type { AssetCreateForm } from '@/types/asset'
import {
  assetImportConfig as importConfig,
  assetHeaderExamples as headerExamples,
  assetExampleColumns as exampleColumns,
  assetExampleRows as exampleRows,
} from './assetBatchImport.config'

const router = useRouter()
const assetStore = useAssetStore()

// 上传组件 ref 和文件列表状态
const uploadRef = ref<UploadInstance>()
const fileList = ref<UploadFile[]>([])
const localIsSubmitting = ref(false)

// ===== 使用批量导入 Hook（仅用于 Excel 解析和数据验证）=====
// 注意：从 useBatchImport 获取原始的 handleFileChange（它期望原生 File 对象)
const {
  previewData,
  validDataCount,
  parseError, // 新增
  handleFileChange: rawHandleFileChange,
  clearData,
} = useBatchImport<AssetExcelRow, AssetCreateForm>(importConfig)

// ===== 预览表格分页（公共组合式函数，DR-1 收敛）=====
const { previewPageSize, currentPreviewPage, paginatedPreviewData, resetPreviewPage, handlePreviewPageChange } =
  usePreviewPagination(previewData)

// ===== 适配 el-upload 的 onChange 事件 =====
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

// ===== 导出模板（公共工具函数，DR-1 收敛）=====
const handleExportTemplate = async () => {
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
  await downloadExcelTemplate('资产导入模板', headers, [exampleRowData], '资产批量导入模板.xlsx')
}

/**
 * 提交处理：调用后端批量创建接口，一次性提交所有有效数据 * 解决原有逐条创建因并发请求去重导致的数据丢失问题
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
      // 处理 400 错误：后端返回 { code: 400, data: { items: [{ field: ["错误"] }] } }
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
  clearData() // 清除预览数据和提交结果
  fileList.value = [] // 清空本地文件列表
  uploadRef.value?.clearFiles() // 清空 el-upload 组件内部的文件列表
  resetPreviewPage() // 分页重置到第一页
  ElMessage.info('已清空所有数据')
}

// ===== 返回上一页 =====
const goBack = () => {
  router.go(-1)
}
</script>

<style scoped lang="scss" src="./AssetBatchImport.scss"></style>
