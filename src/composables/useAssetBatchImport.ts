/**
 * @file 资产 Excel 批量导入的核心逻辑（解析、校验、提交）
 * @module composables/useAssetBatchImport
 * @exports
 *   - useAssetBatchImport: 资产批量导入 composable
 * @callers
 *   - components/componentsdetails/detils/AssetBatchImport.vue
 * @dependsOn
 *   - composables/useBatchImport: 通用批量导入基座
 *   - stores/assetStore: 资产批量创建 API
 *   - utils/SubmitBatch: 错误信息提取工具
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import { useAssetStore } from '@/stores/assetStore'
import { useBatchImport } from '@/composables/useBatchImport'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import type { AssetCreateForm, AssetDetail } from '@/types/asset'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import type { AssetExcelRow } from '@/types/batch-import'

export function useAssetBatchImport() {
  const router = useRouter()
  const assetStore = useAssetStore()

  const uploadRef = ref<UploadInstance>()
  const fileList = ref<UploadFile[]>([])
  const localIsSubmitting = ref(false)
  const previewPageSize = 10
  const currentPreviewPage = ref(1)

  const importConfig: BatchImportConfig<AssetExcelRow, AssetCreateForm> = {
    entityName: '资产',
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
    requiredFields: [
      'asset_name',
      'asset_specification',
      'asset_purchase_price',
      'asset_purchase_number',
      'asset_entry_date',
      'asset_type',
      'asset_current_status',
    ],
    validateItem: (item: AssetExcelRow) => {
      const errors: Record<string, string> = {}
      if (!item.asset_name?.trim()) errors.asset_name = '资产名称不能为空'
      else if (item.asset_name.length < 2 || item.asset_name.length > 100)
        errors.asset_name = '名称长度 2-100 个字符'
      if (!item.asset_specification?.trim()) errors.asset_specification = '规格型号不能为空'
      const price = Number(item.asset_purchase_price)
      if (isNaN(price) || price < 0) errors.asset_purchase_price = '单价必须是有效数字且不小于0'
      const quantity = Number(item.asset_purchase_number)
      if (isNaN(quantity) || !Number.isInteger(quantity) || quantity < 1)
        errors.asset_purchase_number = '采购数量必须是正整数'
      if (item.asset_entry_date && !/^\d{4}-\d{2}-\d{2}$/.test(item.asset_entry_date))
        errors.asset_entry_date = '入库日期格式应为 YYYY-MM-DD'
      if (!item.asset_type?.trim()) errors.asset_type = '资产分类编码不能为空'
      if (item.asset_purchase_date && !/^\d{4}-\d{2}-\d{2}$/.test(item.asset_purchase_date))
        errors.asset_purchase_date = '采购日期格式应为 YYYY-MM-DD'
      if (item.asset_warranty_period) {
        const p = Number(item.asset_warranty_period)
        if (isNaN(p) || p < 0) errors.asset_warranty_period = '质保期必须是有效数字'
      }
      const validStatuses = ['in_store', 'recycled_pending', 'in_use', 'damaged', 'scrapped']
      if (item.asset_current_status && !validStatuses.includes(item.asset_current_status))
        errors.asset_current_status = '当前状态值非法'
      return { valid: Object.keys(errors).length === 0, errors }
    },
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
    createFn: async () => ({}) as AssetCreateForm,
    idField: 'asset_name',
  } as const

  const {
    previewData,
    validDataCount,
    parseError,
    handleFileChange: rawHandleFileChange,
    clearData,
  } = useBatchImport<AssetExcelRow, AssetCreateForm>(importConfig)

  const paginatedPreviewData = computed(() => {
    const start = (currentPreviewPage.value - 1) * previewPageSize
    return previewData.value.slice(start, start + previewPageSize)
  })

  const resetPreviewPage = () => {
    currentPreviewPage.value = 1
  }

  const handleUploadChange = async (uploadFile: UploadFile, uploadFileList: UploadFile[]) => {
    fileList.value = uploadFileList
    const rawFile = uploadFile.raw
    if (!rawFile) {
      ElMessage.warning('无法读取文件，请重新选择')
      return
    }
    await rawHandleFileChange(rawFile)
    resetPreviewPage()
  }

  const handlePreviewPageChange = (page: number) => {
    currentPreviewPage.value = page
  }

  const handleSubmit = async () => {
    const validRows = previewData.value.filter((r) => r.validationStatus === 'success')
    if (validRows.length === 0) {
      ElMessage.warning('没有有效数据可提交')
      return
    }
    localIsSubmitting.value = true
    try {
      const apiDataList = validRows.map((r) => importConfig.transformToApiData(r.data))
      previewData.value.forEach((row) => {
        row.submitStatus = undefined
        row.submitError = undefined
      })
      let result: {
        total: number
        success_count: number
        fail_count: number
        success_items: AssetDetail[]
        fail_items: Array<{ index: number; error_message: string }>
      }
      try {
        const res = await assetStore.batchCreateAssets(apiDataList)
        result = res
      } catch (axiosError: unknown) {
        const err = axiosError as { response?: { status: number; data: Record<string, unknown> } }
        if (err.response?.status === 400) {
          const respData = err.response.data
          const detailItems = (respData?.data as Record<string, unknown>)?.items as
            | Array<Record<string, string[]>>
            | undefined
          if (detailItems && Array.isArray(detailItems)) {
            const failedMap = new Map<number, string>()
            detailItems.forEach((itemErrors, idx) => {
              const msgs = Object.values(itemErrors).flat()
              if (msgs.length > 0) failedMap.set(idx, msgs.join(''))
            })
            validRows.forEach((row, idx) => {
              if (failedMap.has(idx)) {
                row.submitStatus = 'error'
                row.submitError = failedMap.get(idx) || '验证失败'
              } else {
                row.submitStatus = 'success'
              }
            })
            ElMessage.warning('导入完成：部分数据验证失败')
            return
          }
        }
        throw axiosError
      }
      if (result.fail_count > 0) {
        const failedMap = new Map<number, string>()
        result.fail_items.forEach((f) => failedMap.set(f.index, f.error_message))
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
        assetStore.setRefreshFlag(true)
      } else {
        ElMessage.warning(`导入完成：成功 ${result.success_count} 条，失败 ${result.fail_count} 条`)
      }
    } catch (error) {
      ElMessage.error(`导入失败：${extractErrorMessage(error)}`)
    } finally {
      localIsSubmitting.value = false
    }
  }

  const handleClear = () => {
    clearData()
    fileList.value = []
    uploadRef.value?.clearFiles()
    resetPreviewPage()
    ElMessage.info('已清空所有数据')
  }

  return {
    uploadRef,
    fileList,
    localIsSubmitting,
    previewPageSize,
    currentPreviewPage,
    importConfig,
    previewData,
    validDataCount,
    parseError,
    paginatedPreviewData,
    handleUploadChange,
    handlePreviewPageChange,
    handleSubmit,
    handleClear,
    goBack: () => router.go(-1),
  }
}
