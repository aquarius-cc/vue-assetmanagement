/**
 * useRecycleFormSubmit
 * 回收表单提交逻辑（单条/批量/确认弹窗）
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { isAxiosError } from 'axios'
import { recycleAssetAPI } from '@/api/recycleAsset'
import type {
  RecycleAssetCreateForm,
  RecycleAssetBatchItem,
  RecycleAssetExtended,
  RecycleAssetUpdateForm,
} from '@/utils/RecycleAsset'
import type { SelectedRecord } from '@/components/componentsdetails/detils/detilschildcomponents/SelectedRecordsTable.vue'

export function useRecycleFormSubmit(options: {
  isEditMode: () => boolean
  currentRecordcode: () => string | undefined
  selectedRecords: () => SelectedRecord[]
  formData: () => {
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
        const submitData: RecycleAssetCreateForm = {
          outasset_recordcode: form.outasset_recordcode,
          recycle_asset: form.recycle_asset,
          recycle_asset_number: form.recycle_asset_number,
          recycle_asset_storage_code: form.recycle_asset_storage_code,
          recycle_asset_recycle_person_jobcode: form.recycle_asset_recycle_person_jobcode,
          recycle_asset_date: form.recycle_asset_date,
          recycle_type: form.recycle_type,
          recycle_asset_description: form.recycle_asset_description || null,
        }
        await options.recycleStore.update({
          ...submitData,
          outasset_recordcode: options.currentRecordcode(),
          id: form.id,
        })
        ElMessage.success('更新成功')
      } else if (options.selectedRecords().length === 1) {
        const record = options.selectedRecords()[0]
        await recycleAssetAPI.createRecycleAsset({
          outasset_recordcode: record.recordcode,
          recycle_asset: record.recycle_asset,
          recycle_asset_number: 1,
          recycle_asset_storage_code: form.recycle_asset_storage_code,
          recycle_asset_recycle_person_jobcode: form.recycle_asset_recycle_person_jobcode,
          recycle_asset_date: form.recycle_asset_date,
          recycle_type: form.recycle_type,
          recycle_asset_description: form.recycle_asset_description || null,
        })
        ElMessage.success('回收登记成功')
      } else {
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

      options.recycleStore.setRefreshFlag(true)
      confirmVisible.value = false
      router.go(-1)
    } catch (error: unknown) {
      const msg = isAxiosError(error)
        ? error.response?.data?.msg || error.response?.data?.message || '操作失败'
        : error instanceof Error ? error.message : '未知错误'
      ElMessage.error(msg)
    } finally {
      submitting.value = false
      options.setSubmitting(false)
    }
  }

  return { confirmVisible, submitting, confirmData, showConfirm, doSubmit }
}
