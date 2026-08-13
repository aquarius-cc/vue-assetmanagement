/**
 * @file 通用批量导入基座（Excel 解析、行校验、分批提交），供资产/合同导入复用
 * @module composables/useBatchImport
 * @exports
 *   - useBatchImport: 通用批量导入 composable
 *   - ValidatedRow: 校验行数据类型
 * @callers
 *   - composables/useAssetBatchImport: 资产批量导入
 *   - composables/useContractBatchImport: 合同批量导入
 * @dependsOn
 *   - utils/batchImport/types: BatchImportConfig 类型
 *   - utils/SubmitBatch: 分批提交工具
 *   - utils/readExcelFile: Excel 文件解析
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import { submitBatch } from '@/utils/SubmitBatch'
import type { SubmitBatchResult } from '@/utils/SubmitBatch'
import { readExcelFile } from '@/utils/readExcelFile'

export interface ValidatedRow<T> {
  data: T
  validationStatus: 'success' | 'error'
  validationErrors: Record<string, string>
  validationErrorSummary: string
  submitStatus?: 'pending' | 'success' | 'error'
  submitError?: string
}

/**
 * 通用批量导入 Hook
 * @param config 批量导入配置
 */
export function useBatchImport<TExcel extends object, TApi extends object>(
  config: BatchImportConfig<TExcel, TApi>,
) {
  const previewData = ref<ValidatedRow<TExcel>[]>([])
  const isSubmitting = ref(false)
  const fileRef = ref<File | null>(null)
  const submitResult = ref<SubmitBatchResult<TApi> | null>(null)
  const parseError = ref<string>('')

  const validDataCount = computed(
    () => previewData.value.filter((row) => row.validationStatus === 'success').length,
  )

  const handleFileChange = async (file: File) => {
    parseError.value = ''
    fileRef.value = file
    try {
      const data = await readExcelFile<TExcel>(
        file,
        config.excelHeaderMap as Record<string, string>,
      )
      previewData.value = data.map((item) => {
        const { valid, errors } = config.validateItem(item)
        return {
          data: item,
          validationStatus: valid ? 'success' : 'error',
          validationErrors: errors,
          validationErrorSummary: Object.values(errors).join('；'),
          submitStatus: undefined,
          submitError: undefined,
        }
      })
      ElMessage.success(`成功读取 ${data.length} 条记录`)
    } catch (error) {
      console.error('Excel 解析失败:', error)
      const msg = error instanceof Error ? error.message : '未知错误'
      parseError.value = msg
      ElMessage.error(`文件解析失败: ${msg}`)
      previewData.value = []
    }
  }

  const submitBatchData = async () => {
    if (validDataCount.value === 0) {
      ElMessage.warning('没有有效数据可提交')
      return false
    }
    if (!config.idField) {
      ElMessage.error(`${config.entityName} 批量导入配置缺少 idField 字段`)
      return false
    }

    const validRows = previewData.value.filter((r) => r.validationStatus === 'success')
    const apiDataList: TApi[] = validRows.map((r) => config.transformToApiData(r.data as TExcel))

    previewData.value.forEach((row) => {
      row.submitStatus = undefined
      row.submitError = undefined
    })

    isSubmitting.value = true
    try {
      const idField = config.idField as keyof TApi
      const result = await submitBatch(apiDataList, config.createFn, {
        entityName: config.entityName,
        idField,
        concurrency: config.concurrency ?? 5,
      })
      submitResult.value = result

      if (result.failedItems.length > 0) {
        const failedMap = new Map<string, string>()
        result.failedItems.forEach((failed) => {
          const idValue = failed.item[idField]
          if (idValue !== undefined && idValue !== null) {
            failedMap.set(String(idValue), failed.error)
          }
        })
        previewData.value.forEach((row) => {
          if (row.validationStatus === 'success') {
            const apiData = config.transformToApiData(row.data as TExcel)
            const rowId = String(apiData[idField] ?? '')
            if (failedMap.has(rowId)) {
              row.submitStatus = 'error'
              row.submitError = failedMap.get(rowId) || '提交失败'
            } else {
              row.submitStatus = 'success'
            }
          }
        })
      } else {
        validRows.forEach((row) => {
          row.submitStatus = 'success'
        })
      }

      if (result.failedItems.length === 0) {
        ElMessage.success(`全部导入成功！共 ${result.successCount} 条`)
      } else {
        ElMessage.warning(
          `导入完成：成功 ${result.successCount} 条，失败 ${result.failedItems.length} 条`,
        )
      }
      return true
    } catch (error) {
      const msg = error instanceof Error ? error.message : '导入过程发生未知错误'
      ElMessage.error(`导入失败：${msg}`)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  const clearData = () => {
    previewData.value = []
    fileRef.value = null
    submitResult.value = null
  }

  return {
    previewData,
    validDataCount,
    isSubmitting,
    submitResult,
    parseError,
    handleFileChange,
    submitBatchData,
    clearData,
  }
}
