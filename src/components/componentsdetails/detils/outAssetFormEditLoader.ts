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
import { logError } from '@/utils/logger'

/** 编辑加载器依赖 */
export interface OutAssetEditLoaderDeps {
  form: OutAssetCreateExtended
  selectedApplicant: Ref<EmployeeAutocompleteItem | null>
  selectedManager: Ref<EmployeeAutocompleteItem | null>
  /** 原始数据快照（用于编辑模式变更检测） */
  originalFormData: Ref<OutAssetCreateExtended | null>
  isLoading: Ref<boolean>
  // 详情记录字段动态回填（原组件实现即按动态属性访问；any 为兼容后端动态结构，非笔误）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: { getById(code: string): Promise<any> }
  router: { back: () => void }
}

/** 创建编辑数据加载函数 loadEditData(recordcode) */
export function createOutAssetEditLoader(deps: OutAssetEditLoaderDeps) {
  const { form, selectedApplicant, selectedManager, originalFormData, isLoading, store, router } =
    deps

  // 空值兜底助手：与原 `x || ''` 逐字等价（null/undefined/'' 均落 ''）。
  // P1-4 复杂度收敛用：把 `||` 分支从字段填充语句里收走。
  const pick = (value: unknown): string => (typeof value === 'string' ? value : '')
  const pickStr = (value: string | null | undefined): string => value ?? ''

  // 日期字段填充：有值则格式化，格式化结果再兜底为 ''（与原三元 + `|| ''` 逐字等价）。
  const pickDate = (value: unknown): string => (value ? formatDate(String(value)) || '' : '')

  // 填充表单标量字段
  const fillForm = (detail: Record<string, unknown>) => {
    form.outasset_code = pick(detail.outasset_code)
    form.outasset_number = detail.outasset_number as number
    // [HR-02] 回填申请人保管人信息（从后端返回的关联对象或字段获取）
    form.outasset_applicant_jobcode = pick(detail.outasset_applicant_jobcode)
    form.outasset_manager_jobcode = pick(detail.outasset_manager_jobcode)
    form.outasset_applicant_name = pick(
      (detail.outasset_applicant as Record<string, unknown> | undefined)?.employee_name,
    )
    form.outasset_manager_name = pick(
      (detail.outasset_manager as Record<string, unknown> | undefined)?.employee_name,
    )
    form.outasset_date = pickDate(detail.outasset_date)
    form.return_date = pickDate(detail.return_date)
    form.outasset_type = pick(detail.outasset_type)
    form.outasset_using_location = pick(detail.outasset_using_location)
    form.outasset_description = pick(detail.outasset_description)
    form.outasset_name = pick(detail.asset_name)
  }

  // 构建单个选中状态对象（申请/保管人同构，抽为同一函数）。
  // [HR-02] 回填后同步选中状态（用于变更检测）。
  // 注意：关联对象为 EmployeeExtended 类型，含 employee_department；类型断言绕过推断限制。
  const buildSelected = (
    rel: Record<string, unknown> | undefined,
    name: string,
    jobcode: string,
  ): EmployeeAutocompleteItem => {
    const dept = rel?.employee_department as Record<string, string> | undefined
    return {
      value: name,
      employee_name: name,
      employee_jobcode: pick(jobcode),
      employee_department_name: pick(dept?.department_name),
    }
  }

  // 回填选中状态：仅在姓名非空时同步（申请人与保管人同构）。
  const syncSelected = (detail: Record<string, unknown>) => {
    if (form.outasset_applicant_name) {
      selectedApplicant.value = buildSelected(
        detail.outasset_applicant as Record<string, unknown> | undefined,
        form.outasset_applicant_name,
        pickStr(form.outasset_applicant_jobcode),
      )
    }
    if (form.outasset_manager_name) {
      selectedManager.value = buildSelected(
        detail.outasset_manager as Record<string, unknown> | undefined,
        form.outasset_manager_name,
        pickStr(form.outasset_manager_jobcode),
      )
    }
  }

  return async function loadEditData(recordcode: string) {
    isLoading.value = true
    try {
      const detail = await store.getById(recordcode)
      if (!detail) {
        ElMessage.error('未找到该出库记录，请返回列表重新选择')
        router.back()
        return
      }
      fillForm(detail)
      syncSelected(detail)
      // 保存原始数据快照
      originalFormData.value = JSON.parse(JSON.stringify(form))
    } catch (error) {
      logError(
        'components/componentsdetails/detils/outAssetFormEditLoader',
        '加载出库资产详情失败:',
        error,
      )
      ElMessage.error('加载出库记录失败，请刷新页面重试')
      router.back()
    } finally {
      isLoading.value = false
    }
  }
}
