/**
 * @file 合同 Excel 批量导入的核心逻辑（解析、校验、提交）
 * @module composables/useContractBatchImport
 * @exports
 *   - useContractBatchImport: 合同批量导入 composable
 * @callers
 *   - components/componentsdetails/detils/ContractBatchImport.vue
 * @dependsOn
 *   - composables/useBatchImport: 通用批量导入基座
 *   - stores/contractStore: 合同 store 状态刷新
 *   - api/contract: 合同批量创建 API
 *   - utils/SubmitBatch: 错误信息提取工具
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import { useContractStore } from '@/stores/contractStore'
import { useBatchImport } from '@/composables/useBatchImport'
import { extractErrorMessage } from '@/utils/SubmitBatch'
import type { ContractCreateForm, ContractStatus } from '@/types/contract'
import type { BatchImportConfig } from '@/utils/batchImport/types'
import type { ContractExcelRow } from '@/types/batch-import'
import { contractAPI } from '@/api/contract'

export function useContractBatchImport() {
  const router = useRouter()
  const contractStore = useContractStore()

  const uploadRef = ref<UploadInstance>()
  const fileList = ref<UploadFile[]>([])
  const localIsSubmitting = ref(false)
  const previewPageSize = 10
  const currentPreviewPage = ref(1)

  const importConfig: BatchImportConfig<ContractExcelRow, ContractCreateForm> = {
    entityName: '合同',
    excelHeaderMap: {
      合同编码: 'contract_code',
      合同名称: 'contract_name',
      供应商: 'supplier_name',
      合同价格: 'contract_amount',
      签订日期: 'contract_start_date',
      合同类型: 'contract_type',
      保修期: 'contract_warranty_period',
      初验日期: 'initial_check_date',
      终验日期: 'final_check_date',
      合同状态: 'contract_status',
      结算价格: 'settlemented_price',
      已付金额: 'amount_paid',
      付款记录: 'paid_record',
    },
    requiredFields: [
      'contract_code',
      'contract_name',
      'supplier_name',
      'contract_amount',
      'contract_start_date',
      'contract_type',
      'contract_warranty_period',
      'contract_status',
    ],
    validateItem: (item: ContractExcelRow) => {
      const errors: Record<string, string> = {}
      if (!item.contract_code?.trim()) errors.contract_code = '合同编码不能为空'
      if (!item.contract_name?.trim()) errors.contract_name = '合同名称不能为空'
      if (!item.supplier_name?.trim()) errors.supplier_name = '供应商不能为空'
      const price = Number(item.contract_amount)
      if (isNaN(price) || price < 0) errors.contract_amount = '合同价格必须是有效数字且不小于0'
      const signingDate =
        typeof item.contract_start_date === 'string'
          ? item.contract_start_date.trim()
          : String(item.contract_start_date ?? '')
      if (!signingDate) errors.contract_start_date = '签订日期不能为空'
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(signingDate))
        errors.contract_start_date = '签订日期格式应为 YYYY-MM-DD'
      const validTypes = [
        'tender_procurement',
        'service',
        'information_construction',
        'direct_procurement',
      ]
      if (!item.contract_type?.trim()) errors.contract_type = '合同类型不能为空'
      else if (!validTypes.includes(item.contract_type)) errors.contract_type = '合同类型无效'
      const warranty = Number(item.contract_warranty_period)
      if (isNaN(warranty) || warranty < 0)
        errors.contract_warranty_period = '保修期必须是有效数字且不小于0'
      const validStatuses = [
        'purchasing',
        'purchase_finished',
        'receive_check',
        'initial_check',
        'project_settlement',
        'settlement_done',
        'final_check',
        'project_finished',
      ]
      if (!item.contract_status?.trim()) errors.contract_status = '合同状态不能为空'
      else if (!validStatuses.includes(item.contract_status))
        errors.contract_status = '合同状态无效'
      if (item.initial_check_date) {
        const d =
          typeof item.initial_check_date === 'string'
            ? item.initial_check_date.trim()
            : String(item.initial_check_date)
        if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d))
          errors.initial_check_date = '初验日期格式应为 YYYY-MM-DD'
      }
      if (item.final_check_date) {
        const d =
          typeof item.final_check_date === 'string'
            ? item.final_check_date.trim()
            : String(item.final_check_date)
        if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d))
          errors.final_check_date = '终验日期格式应为 YYYY-MM-DD'
      }
      if (item.settlemented_price !== undefined && item.settlemented_price !== '') {
        const v = Number(item.settlemented_price)
        if (isNaN(v) || v < 0) errors.settlemented_price = '结算价格必须是有效数字且不小于0'
      }
      if (item.amount_paid !== undefined && item.amount_paid !== '') {
        const v = Number(item.amount_paid)
        if (isNaN(v) || v < 0) errors.amount_paid = '已付金额必须是有效数字且不小于0'
      }
      return { valid: Object.keys(errors).length === 0, errors }
    },
    transformToApiData: (row: ContractExcelRow): ContractCreateForm => ({
      contract_code: row.contract_code.trim(),
      contract_name: row.contract_name.trim(),
      supplier_name: row.supplier_name.trim(),
      contract_amount: Number(row.contract_amount),
      contract_start_date:
        typeof row.contract_start_date === 'string'
          ? row.contract_start_date.trim()
          : String(row.contract_start_date),
      contract_type: row.contract_type.trim(),
      contract_warranty_period: Number(row.contract_warranty_period),
      initial_check_date:
        typeof row.initial_check_date === 'string'
          ? row.initial_check_date.trim()
          : row.initial_check_date
            ? String(row.initial_check_date)
            : null,
      final_check_date:
        typeof row.final_check_date === 'string'
          ? row.final_check_date.trim()
          : row.final_check_date
            ? String(row.final_check_date)
            : null,
      contract_status: row.contract_status.trim() as ContractStatus,
      settlemented_price: row.settlemented_price ? Number(row.settlemented_price) : 0,
    }),
    createFn: async () => ({}) as ContractCreateForm,
    idField: 'contract_code',
  }

  const {
    previewData,
    validDataCount,
    parseError,
    handleFileChange: rawHandleFileChange,
    clearData,
  } = useBatchImport<ContractExcelRow, ContractCreateForm>(importConfig)

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
      }
      if (result.fail_count === 0) {
        ElMessage.success(`全部导入成功！共 ${result.success_count} 条`)
        contractStore.setRefreshFlag(true)
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
