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



<script lang="ts" setup>
defineOptions({ name: 'OutAssetBatchImport' })

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useBatchImport } from '@/composables/useBatchImport'
import { validationTagType, validationTagText } from '@/utils/batchImportHelpers'
import BatchImportGuideCard from '@/components/commoncomponents/BatchImportGuideCard.vue'
import { outAssetAPI } from '@/api/outAsset'
import { useOutAssetStore } from '@/stores/outAssetStore'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import type { OutAssetExcelRow } from '@/types/batch-import'
import type { OutAssetCreateForm } from '@/types/outasset'
import { downloadExcelTemplate } from '@/utils/batchImport/templateExport'
import {
  outAssetImportConfig as importConfig,
  outAssetHeaderExamples as headerExamples,
  outAssetExampleColumns as exampleColumns,
  outAssetExampleRows as exampleRows,
} from './outAssetBatchImport.config'

const router = useRouter()
const outAssetStore = useOutAssetStore()
const fileList = ref<File[]>([])
const localIsSubmitting = ref(false)

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

// ===== 导出模板（公共工具函数，DR-1 收敛）=====
const handleExportTemplate = async () => {
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
    出库类型: 'receive',
    // [HR-01] 后端 v1.1.0 改为 read_only，移除使用位置示例
    资产描述: '用于项目测试',
    // 可选辅助列（推荐填写以便参考）
    资产名称: '服务器主机',
    申请人姓名: '张三',
    保管人姓名: '李四',
    所属仓库: '主仓库',
  }
  await downloadExcelTemplate('出库资产导入模板', headers, [exampleRowData], '出库资产批量导入模板.xlsx')
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

<style scoped lang="scss" src="./OutAssetBatchImport.scss"></style>
