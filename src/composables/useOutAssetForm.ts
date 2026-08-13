/**
 * @file 出库资产表单完整逻辑（新增/编辑、资产选择、申请人/保管人联动、校验提交）
 * @module composables/useOutAssetForm
 * @exports
 *   - useOutAssetForm: 出库资产表单 composable
 * @callers
 *   - components/componentsdetails/detils/OutAssetForm.vue
 * @dependsOn
 *   - stores/outAssetStore | stores/assetStore: CRUD 与查询
 *   - composables/useSuggestionFetcher | useEmployeeSuggestionFetcher | useAutocompleteField
 *   - api/asset | utils/Format | utils/errorHandler
 *   - types/asset | types/outasset
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useOutAssetStore } from '@/stores/outAssetStore'
import { useAssetStore } from '@/stores/assetStore'
import { showErrorMessage } from '@/utils/errorHandler'
import { formatDate } from '@/utils/Format'
import { createSuggestionFetcher } from '@/composables/useSuggestionFetcher'
import { useEmployeeSuggestionFetcher } from '@/composables/useEmployeeSuggestionFetcher'
import { useAutocompleteField } from '@/composables/useAutocompleteField'
import type { AssetDetail, AssetUpdateForm } from '@/types/asset'
import type { OutAssetCreateExtended, OutAssetCreateForm } from '@/types/outasset'
import { AssetCurrentStatus } from '@/types/asset'

type ExtendedAssetStore = ReturnType<typeof useAssetStore> & {
  getByName: (name: string) => Promise<AssetDetail[]>
  getById: (code: string) => Promise<AssetDetail | null>
  update: (data: AssetUpdateForm) => Promise<AssetDetail>
}

export function useOutAssetForm() {
  const route = useRoute()
  const router = useRouter()
  const outAssetStore = useOutAssetStore()
  const assetStore = useAssetStore() as ExtendedAssetStore
  const formRef = ref()
  const isLoading = ref(false)
  const isEditMode = ref(!!route.query.code)

  const outAssetCreateExtendedForm = reactive<OutAssetCreateExtended>({
    outasset_code: '',
    outasset_number: 1,
    outasset_applicant_jobcode: '',
    outasset_manager_jobcode: '',
    outasset_date: '',
    return_date: '',
    outasset_type: '',
    outasset_using_location: '',
    outasset_description: '',
    outasset_name: '',
    outasset_applicant_name: '',
    outasset_manager_name: '',
  })

  const originalFormData = ref<OutAssetCreateExtended | null>(null)

  const outAssetForm = computed<OutAssetCreateForm>(() => ({
    outasset_code: outAssetCreateExtendedForm.outasset_code,
    outasset_number: outAssetCreateExtendedForm.outasset_number,
    outasset_applicant_jobcode: outAssetCreateExtendedForm.outasset_applicant_jobcode || null,
    outasset_manager_jobcode: outAssetCreateExtendedForm.outasset_manager_jobcode || null,
    outasset_date: outAssetCreateExtendedForm.outasset_date
      ? formatDate(outAssetCreateExtendedForm.outasset_date) ||
        new Date().toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    return_date: outAssetCreateExtendedForm.return_date
      ? formatDate(outAssetCreateExtendedForm.return_date)
      : null,
    outasset_type: outAssetCreateExtendedForm.outasset_type,
    outasset_using_location: outAssetCreateExtendedForm.outasset_using_location || null,
    outasset_description: outAssetCreateExtendedForm.outasset_description || null,
  }))

  const rules = {
    outasset_code: [{ required: true, message: '请输入出库资产编码', trigger: 'blur' }],
    outasset_number: [
      { required: true, message: '请输入出库数量', trigger: 'blur' },
      { type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' },
    ],
    outasset_applicant_name: [{ required: true, message: '请选择申请人', trigger: 'change' }],
    outasset_manager_name: [{ required: true, message: '请选择保管人', trigger: 'change' }],
    outasset_using_location: [{ required: true, message: '请输入使用地点', trigger: 'blur' }],
    outasset_type: [{ required: true, message: '请选择出库类型', trigger: 'change' }],
    outasset_date: [{ required: true, message: '请选择出库日期', trigger: 'change' }],
    return_date: [
      {
        validator: (_rule: unknown, value: string, callback: (error?: Error | string) => void) => {
          if (outAssetCreateExtendedForm.outasset_type === 'borrow' && !value)
            callback(new Error('借用类型必须填写归还日期'))
          else callback()
        },
        trigger: 'change',
      },
    ],
  }

  const fetchAssetSuggestions = createSuggestionFetcher({
    fetchData: (query: string) => assetStore.getByName(query),
    // 允许在库和待发放资产出库（与后端 OutAssetService 校验对齐）
    filter: (asset: AssetDetail) =>
      asset.asset_current_status === AssetCurrentStatus.IN_STORE ||
      asset.asset_current_status === AssetCurrentStatus.RECYCLED_PENDING,
    transform: (asset: AssetDetail) => ({
      value: asset.asset_name,
      asset_name: asset.asset_name,
      asset_code: asset.asset_code,
      asset_current_status: asset.asset_current_status ?? '',
    }),
  })

  const fetchEmployeeSuggestions = useEmployeeSuggestionFetcher()
  const applicantField = useAutocompleteField({
    form: outAssetCreateExtendedForm,
    nameField: 'outasset_applicant_name',
    codeField: 'outasset_applicant_jobcode',
    itemKey: 'employee_name',
    codeKey: 'employee_jobcode',
  })
  const managerField = useAutocompleteField({
    form: outAssetCreateExtendedForm,
    nameField: 'outasset_manager_name',
    codeField: 'outasset_manager_jobcode',
    itemKey: 'employee_name',
    codeKey: 'employee_jobcode',
  })

  const selectedAsset = ref<{
    value: string
    asset_name: string
    asset_code: string
    asset_current_status: string
  } | null>(null)
  const selectedApplicant = ref<{
    value: string
    employee_name: string
    employee_jobcode: string
    employee_department_name: string
  } | null>(null)
  const selectedManager = ref<{
    value: string
    employee_name: string
    employee_jobcode: string
    employee_department_name: string
  } | null>(null)

  const handleAssetSelect = (asset: AssetDetail) => {
    outAssetCreateExtendedForm.outasset_code = asset.asset_code
    outAssetCreateExtendedForm.outasset_name = asset.asset_name
    selectedAsset.value = {
      value: asset.asset_name,
      asset_name: asset.asset_name,
      asset_code: asset.asset_code,
      asset_current_status: asset.asset_current_status || '',
    }
    ElMessage.success('资产已选择')
  }

  const clearAssetInfo = () => {
    outAssetCreateExtendedForm.outasset_name = ''
    outAssetCreateExtendedForm.outasset_code = ''
    selectedAsset.value = null
  }

  const handleAssetNameSelect = (item: {
    value: string
    asset_name: string
    asset_code: string
  }) => {
    selectedAsset.value = { ...item, asset_current_status: '' }
    outAssetCreateExtendedForm.outasset_name = item.asset_name
    outAssetCreateExtendedForm.outasset_code = item.asset_code
  }

  const handleAssetNameChange = (value: string) => {
    if (selectedAsset.value?.asset_name !== value) selectedAsset.value = null
  }

  const handleAssetNameBlur = async (event: FocusEvent) => {
    const currentValue = (event.target as HTMLInputElement).value
    if (selectedAsset.value?.asset_name === currentValue) return
    if (!currentValue) {
      clearAssetInfo()
      return
    }
    try {
      const assets = await assetStore.getByName(currentValue.trim())
      if (assets?.length === 1) {
        const asset = assets[0]
        outAssetCreateExtendedForm.outasset_name = asset.asset_name
        outAssetCreateExtendedForm.outasset_code = asset.asset_code
        selectedAsset.value = {
          value: asset.asset_name,
          asset_name: asset.asset_name,
          asset_code: asset.asset_code,
          asset_current_status: asset.asset_current_status ?? '',
        }
      } else {
        outAssetCreateExtendedForm.outasset_code = '(请从下拉列表中选择正确的资产)'
        selectedAsset.value = null
      }
    } catch (error) {
      console.error('资产名称校验失败:', error)
      clearAssetInfo()
    }
  }

  const handleAssetCodeChange = async (code: string) => {
    if (!code.trim()) {
      clearAssetInfo()
      return
    }
    try {
      const asset = await assetStore.getById(code)
      if (asset) {
        outAssetCreateExtendedForm.outasset_name = asset.asset_name
        selectedAsset.value = {
          value: asset.asset_name,
          asset_name: asset.asset_name,
          asset_code: asset.asset_code,
          asset_current_status: asset.asset_current_status ?? '',
        }
      } else {
        outAssetCreateExtendedForm.outasset_code = '编码错误，无此资产'
        outAssetCreateExtendedForm.outasset_name = ''
        selectedAsset.value = null
      }
    } catch (error) {
      showErrorMessage(error, '系统错误，请稍后再试')
      clearAssetInfo()
    }
  }

  const loadEditData = async (recordcode: string) => {
    isLoading.value = true
    try {
      const detail = await outAssetStore.getById(recordcode)
      if (!detail) {
        ElMessage.error('未找到该出库记录')
        router.back()
        return
      }
      Object.assign(outAssetCreateExtendedForm, {
        outasset_code: detail.outasset_code || '',
        outasset_number: detail.outasset_number,
        outasset_applicant_jobcode: detail.outasset_applicant_jobcode || '',
        outasset_manager_jobcode: detail.outasset_manager_jobcode || '',
        outasset_applicant_name: detail.outasset_applicant?.employee_name || '',
        outasset_manager_name: detail.outasset_manager?.employee_name || '',
        outasset_date: detail.outasset_date ? formatDate(detail.outasset_date) || '' : '',
        return_date: detail.return_date ? formatDate(detail.return_date) || '' : '',
        outasset_type: detail.outasset_type || '',
        outasset_using_location: detail.outasset_using_location || '',
        outasset_description: detail.outasset_description || '',
        outasset_name: detail.asset_name || '',
      })
      originalFormData.value = JSON.parse(JSON.stringify(outAssetCreateExtendedForm))
    } catch (error) {
      showErrorMessage(error, '加载出库记录失败')
      router.back()
    } finally {
      isLoading.value = false
    }
  }

  const submitForm = () => {
    formRef.value.validate(async (valid: boolean) => {
      if (!valid) {
        ElMessage.error('请填写所有必填项')
        return
      }
      if (isEditMode.value && originalFormData.value) {
        const hasChanged = Object.keys(outAssetCreateExtendedForm).some(
          (key) =>
            (outAssetCreateExtendedForm as Record<string, unknown>)[key] !==
            (originalFormData.value as Record<string, unknown>)[key],
        )
        if (!hasChanged) {
          ElMessage.info('数据未修改，无需提交')
          return
        }
      }
      try {
        if (isEditMode.value) {
          await outAssetStore.update({
            asset_recordcode: route.query.code as string,
            ...outAssetForm.value,
          })
          ElMessage.success('出库资产修改成功')
        } else {
          await outAssetStore.create(outAssetForm.value)
          ElMessage.success('出库资产录入成功')
        }
        outAssetStore.setRefreshFlag(true)
        router.push({ name: 'OutAssetDetails' })
      } catch (error: unknown) {
        showErrorMessage(error, '操作失败')
      }
    })
  }

  const resetForm = () => {
    formRef.value?.resetFields()
    Object.assign(outAssetCreateExtendedForm, {
      outasset_code: '',
      outasset_number: 1,
      outasset_applicant_jobcode: '',
      outasset_manager_jobcode: '',
      outasset_date: '',
      return_date: '',
      outasset_type: '',
      outasset_using_location: '',
      outasset_description: '',
      outasset_name: '',
      outasset_applicant_name: '',
      outasset_manager_name: '',
    })
    selectedAsset.value = null
    selectedApplicant.value = null
    selectedManager.value = null
    ElMessage.info('表单已重置')
  }

  onMounted(async () => {
    if (isEditMode.value) {
      const code = route.query.code as string
      if (!code) {
        ElMessage.error('编辑请求缺少记录编码')
        router.back()
        return
      }
      await loadEditData(code)
    }
  })

  return {
    formRef,
    isLoading,
    isEditMode,
    outAssetCreateExtendedForm,
    outAssetForm,
    rules,
    fetchAssetSuggestions,
    fetchEmployeeSuggestions,
    applicantField,
    managerField,
    selectedAsset,
    selectedApplicant,
    selectedManager,
    handleAssetSelect,
    handleAssetNameSelect,
    handleAssetNameChange,
    handleAssetNameBlur,
    handleAssetCodeChange,
    submitForm,
    resetForm,
    goBack: () => router.go(-1),
  }
}
