/**
 * @file 回收表单提交逻辑（单条/批量/编辑，含确认弹窗）
 * @module composables/useRecycleFormSubmit
 * @exports
 *   - useRecycleFormSubmit: 回收表单提交 composable
 * @callers
 *   - components/componentsdetails/detils/RecycleAssetForm.vue
 * @dependsOn
 *   - api/recycleAsset: 回收资产 API
 *   - types/recycleasset: 回收资产表单类型
 *   - utils/errorHandler: 错误处理
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { isAxiosError } from 'axios'
import { recycleAssetAPI } from '@/api/recycleAsset'
import type {
  RecycleAssetBatchItem,
  RecycleAssetExtended,
  RecycleAssetUpdateForm,
} from '@/types/recycleasset'
import type { SelectedRecord } from '@/components/componentsdetails/detils/detilschildcomponents/SelectedRecordsTable.vue'

/** formData() 返回的表单结构（原内联类型提取，避免助手签名漂移） */
interface RecycleAssetFormData {
  outasset_recordcode: string
  recycle_asset: string
  recycle_asset_number: number
  recycle_asset_storage_code: string
  recycle_asset_recycle_person_jobcode: string
  recycle_asset_date: string
  recycle_type: string
  recycle_asset_description: string
  id?: number
}

export function useRecycleFormSubmit(options: {
  isEditMode: () => boolean
  currentRecordcode: () => string | undefined
  selectedRecords: () => SelectedRecord[]
  formData: () => RecycleAssetFormData
  recycleStore: {
    update: (data: Partial<RecycleAssetUpdateForm>) => Promise<RecycleAssetExtended>
    setRefreshFlag: (v: boolean) => void
  }
  setSubmitting: (v: boolean) => void
}) {
  const router = useRouter()
  const confirmVisible = ref(false)
  const submitting = ref(false)

  interface ConfirmData {
    actionType: string
    recordCount: number
    records: SelectedRecord[]
    storageName: string
    personName: string
    recycleDate: string
    recycleType: string
  }

  const confirmData = ref<ConfirmData | null>(null)

  const showConfirm = (data: ConfirmData) => {
    confirmData.value = data
    confirmVisible.value = true
  }

  const doSubmit = async () => {
    submitting.value = true
    options.setSubmitting(true)
    try {
      const form = options.formData()

      if (options.isEditMode() && options.currentRecordcode()) {
        await submitUpdate(form)
        ElMessage.success('更新成功')
      } else if (options.selectedRecords().length === 1) {
        await submitSingle(form)
        ElMessage.success('回收登记成功')
      } else {
        await submitBatch(form)
      }

      options.recycleStore.setRefreshFlag(true)
      confirmVisible.value = false
      router.go(-1)
    } catch (error: unknown) {
      const msg = isAxiosError(error)
        ? error.response?.data?.message || '操作失败'
        : error instanceof Error
          ? error.message
          : '未知错误'
      ElMessage.error(msg)
    } finally {
      submitting.value = false
      options.setSubmitting(false)
    }
  }

  // [P1-4] 三分支拆分：doSubmit 降圈，三个 submit* 助手与原内联实现逐字等价

  /**
   * 编辑模式提交（update）
   * 后端 service 白名单仅允许 recycle_asset_date/recycle_type/recycle_asset_description
   * （RECYCLE_ASSET_UPDATE_ALLOWED_FIELDS），发其余字段（如 recycle_asset_number）会 400。
   * outasset_recordcode 仅用于 API 层定位记录（后端 serializer 中为 read_only）。
   */
  const submitUpdate = async (form: RecycleAssetFormData) => {
    await options.recycleStore.update({
      outasset_recordcode: options.currentRecordcode(),
      recycle_asset_date: form.recycle_asset_date,
      recycle_type: form.recycle_type,
      recycle_asset_description: form.recycle_asset_description || null,
      id: form.id,
    })
  }

  /**
   * 单选模式提交（createRecycleAsset）
   * 对齐后端 RecycleAssetCreateSerializer：storage_code 必填（slug=storage_code）；
   * 不发 recycle_asset / recycle_asset_storage / recycle_asset_recycle_person_jobcode
   * （单条 serializer 不接收，回收人取当前登录操作者）。
   */
  const submitSingle = async (form: RecycleAssetFormData) => {
    const record = options.selectedRecords()[0]
    await recycleAssetAPI.createRecycleAsset({
      outasset_recordcode: record.recordcode,
      storage_code: form.recycle_asset_storage_code,
      recycle_asset_number: 1,
      recycle_asset_date: form.recycle_asset_date,
      recycle_type: form.recycle_type,
      recycle_asset_description: form.recycle_asset_description || null,
    })
  }

  /** 批量模式提交（batchCreateRecycleAssets） */
  const submitBatch = async (form: RecycleAssetFormData) => {
    const items: RecycleAssetBatchItem[] = options.selectedRecords().map((r) => ({
      recycle_outasset_code: r.recordcode,
      recycle_date: form.recycle_asset_date,
      recycle_type: form.recycle_type,
      recycle_description: form.recycle_asset_description || undefined,
    }))
    const result = await recycleAssetAPI.batchCreateRecycleAssets({
      items,
      recycle_asset_storage: form.recycle_asset_storage_code,
      recycle_asset_recycle_person_jobcode: form.recycle_asset_recycle_person_jobcode,
    })
    if (result.fail_count > 0) {
      const failDetails = result.fail_items
        .map((f) => `行${f.row_number ?? f.index + 1}: ${f.error_message}`)
        .join('\n')
      await ElMessageBox.alert(
        `成功 ${result.success_count} 条，失败 ${result.fail_count} 条\n\n失败详情：\n${failDetails}`,
        '批量回收结果',
        { type: 'warning' },
      )
    } else {
      ElMessage.success(`批量回收成功，共 ${result.success_count} 条`)
    }
  }

  return { confirmVisible, submitting, confirmData, showConfirm, doSubmit }
}
