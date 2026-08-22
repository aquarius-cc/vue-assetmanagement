/**
 * 出库表单「编辑模式数据加载」逻辑（自 OutAssetForm.vue 物理提取，零逻辑变更）
 *
 * 依赖以参数注入：表单对象、申请人/保管人选中状态、原始数据快照、
 * loading 状态、outAssetStore 与路由。填充与回填逻辑逐行保持一致。
 */
import type { Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { formatDate } from '@/utils/Format'
import type { OutAssetCreateExtended, EmployeeAutocompleteItem } from '@/types/outasset'

/** 编辑加载器依赖 */
export interface OutAssetEditLoaderDeps {
  form: OutAssetCreateExtended
  selectedApplicant: Ref<EmployeeAutocompleteItem | null>
  selectedManager: Ref<EmployeeAutocompleteItem | null>
  /** 原始数据快照（用于编辑模式变更检测） */
  originalFormData: Ref<OutAssetCreateExtended | null>
  isLoading: Ref<boolean>
  // 详情记录字段动态回填（原组件实现即按动态属性访问）
  // AI_REVIEW_NEEDED: 使用 any 以匹配后端动态详情结构，人工复查后可细化为 OutAssetDetail
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: { getById(code: string): Promise<any> }
  router: { back: () => void }
}

/** 创建编辑数据加载函数 loadEditData(recordcode) */
export function createOutAssetEditLoader(deps: OutAssetEditLoaderDeps) {
  const {
    form,
    selectedApplicant,
    selectedManager,
    originalFormData,
    isLoading,
    store,
    router,
  } = deps

  return async function loadEditData(recordcode: string) {
    isLoading.value = true
    try {
      const detail = await store.getById(recordcode)
      if (!detail) {
        ElMessage.error('未找到该出库记录，请返回列表重新选择')
        router.back()
        return
      }
      // 填充表单
      form.outasset_code = detail.outasset_code || ''
      form.outasset_number = detail.outasset_number
      // [HR-02] 回填申请人保管人信息（从后端返回的关联对象或字段获取）
      form.outasset_applicant_jobcode = detail.outasset_applicant_jobcode || ''
      form.outasset_manager_jobcode = detail.outasset_manager_jobcode || ''
      form.outasset_applicant_name = detail.outasset_applicant?.employee_name || ''
      form.outasset_manager_name = detail.outasset_manager?.employee_name || ''
      form.outasset_date = detail.outasset_date ? formatDate(detail.outasset_date) || '' : ''
      form.return_date = detail.return_date ? formatDate(detail.return_date) || '' : ''
      form.outasset_type = detail.outasset_type || ''
      form.outasset_using_location = detail.outasset_using_location || ''
      form.outasset_description = detail.outasset_description || ''
      form.outasset_name = detail.asset_name || ''
      // [HR-02] 回填后同步选中状态（用于变更检测）
      // 注意：detail.outasset_applicant/outasset_manager 为 EmployeeExtended 类型
      // 包含 employee_department 关联对象；使用类型断言绕过 TypeScript 推断限制
      if (form.outasset_applicant_name) {
        const applicant = detail.outasset_applicant as Record<string, unknown> | undefined
        const applicantDept = applicant?.employee_department as Record<string, string> | undefined
        selectedApplicant.value = {
          value: form.outasset_applicant_name,
          employee_name: form.outasset_applicant_name,
          employee_jobcode: form.outasset_applicant_jobcode || '',
          employee_department_name: applicantDept?.department_name || '',
        }
      }
      if (form.outasset_manager_name) {
        const manager = detail.outasset_manager as Record<string, unknown> | undefined
        const managerDept = manager?.employee_department as Record<string, string> | undefined
        selectedManager.value = {
          value: form.outasset_manager_name,
          employee_name: form.outasset_manager_name,
          employee_jobcode: form.outasset_manager_jobcode || '',
          employee_department_name: managerDept?.department_name || '',
        }
      }
      // 保存原始数据快照
      originalFormData.value = JSON.parse(JSON.stringify(form))
    } catch (error) {
      console.error('加载出库资产详情失败:', error)
      ElMessage.error('加载出库记录失败，请刷新页面重试')
      router.back()
    } finally {
      isLoading.value = false
    }
  }
}
