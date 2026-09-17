import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { OutAssetCreateExtended, EmployeeAutocompleteItem } from '@/types/outasset'
import { createOutAssetEditLoader } from '../outAssetFormEditLoader'

const mocks = vi.hoisted(() => ({
  elMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

vi.mock('element-plus', () => ({
  ElMessage: mocks.elMessage,
}))

function makeForm(): OutAssetCreateExtended {
  return {
    outasset_name: '',
    outasset_code: '',
    outasset_number: 1,
    outasset_type: '',
    outasset_using_location: '',
    outasset_applicant_jobcode: '',
    outasset_manager_jobcode: '',
    outasset_applicant_name: '',
    outasset_manager_name: '',
    outasset_date: '',
    return_date: '',
    outasset_description: '',
  } as OutAssetCreateExtended
}

interface SetupOptions {
  detail?: unknown
  getByIdError?: boolean
}

function makeDetail() {
  return {
    outasset_code: 'OA-001',
    outasset_number: 2,
    outasset_applicant_jobcode: 'J001',
    outasset_manager_jobcode: 'J002',
    outasset_applicant: {
      employee_name: '张三',
      employee_department: { department_name: '技术部' },
    },
    outasset_manager: {
      employee_name: '李四',
      employee_department: { department_name: '财务部' },
    },
    outasset_date: '2025-01-02T00:00:00+08:00',
    return_date: '2025-02-02T00:00:00+08:00',
    outasset_type: 'usage',
    outasset_using_location: '机房',
    outasset_description: '因工作使用',
    asset_name: '服务器',
  }
}

function setup(options: SetupOptions = {}) {
  const form = makeForm()
  const selectedApplicant = ref<EmployeeAutocompleteItem | null>(null)
  const selectedManager = ref<EmployeeAutocompleteItem | null>(null)
  const originalFormData = ref<OutAssetCreateExtended | null>(null)
  const isLoading = ref(false)
  const store = {
    getById: options.getByIdError
      ? vi.fn(async () => {
          throw new Error('boom')
        })
      : vi.fn(async () => (options.detail !== undefined ? options.detail : makeDetail())),
  }
  const router = { back: vi.fn() }
  const loadEditData = createOutAssetEditLoader({
    form,
    selectedApplicant,
    selectedManager,
    originalFormData,
    isLoading,
    store,
    router,
  })
  return {
    form,
    selectedApplicant,
    selectedManager,
    originalFormData,
    isLoading,
    store,
    router,
    loadEditData,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('createOutAssetEditLoader', () => {
  it('成功加载详情时回填表单与选中状态', async () => {
    const {
      form,
      selectedApplicant,
      selectedManager,
      originalFormData,
      isLoading,
      store,
      loadEditData,
    } = setup()
    await loadEditData('OA-001')
    expect(store.getById).toHaveBeenCalledWith('OA-001')
    expect(form.outasset_code).toBe('OA-001')
    expect(form.outasset_number).toBe(2)
    expect(form.outasset_applicant_name).toBe('张三')
    expect(form.outasset_manager_name).toBe('李四')
    expect(form.outasset_date).toBe('2025-01-02')
    expect(form.return_date).toBe('2025-02-02')
    expect(form.outasset_type).toBe('usage')
    expect(form.outasset_using_location).toBe('机房')
    expect(form.outasset_description).toBe('因工作使用')
    expect(form.outasset_name).toBe('服务器')
    expect(selectedApplicant.value).toMatchObject({
      value: '张三',
      employee_name: '张三',
      employee_jobcode: 'J001',
      employee_department_name: '技术部',
    })
    expect(selectedManager.value).toMatchObject({
      value: '李四',
      employee_name: '李四',
      employee_jobcode: 'J002',
      employee_department_name: '财务部',
    })
    expect(originalFormData.value).not.toBeNull()
    expect(isLoading.value).toBe(false)
  })

  it('详情中缺少申请人依赖时不同步选中状态', async () => {
    const form = makeForm()
    const selectedApplicant = ref<EmployeeAutocompleteItem | null>(null)
    const selectedManager = ref<EmployeeAutocompleteItem | null>(null)
    const originalFormData = ref<OutAssetCreateExtended | null>(null)
    const isLoading = ref(false)
    const detail = makeDetail()
    delete detail.outasset_applicant
    delete detail.outasset_manager
    const store = { getById: vi.fn(async () => detail) }
    const router = { back: vi.fn() }
    const loadEditData = createOutAssetEditLoader({
      form,
      selectedApplicant,
      selectedManager,
      originalFormData,
      isLoading,
      store,
      router,
    })
    await loadEditData('OA-002')
    expect(selectedApplicant.value).toBeNull()
    expect(selectedManager.value).toBeNull()
  })

  it('详情字段缺失时回退为空字符串', async () => {
    const form = makeForm()
    const selectedApplicant = ref<EmployeeAutocompleteItem | null>(null)
    const selectedManager = ref<EmployeeAutocompleteItem | null>(null)
    const originalFormData = ref<OutAssetCreateExtended | null>(null)
    const isLoading = ref(false)
    const detail = {
      outasset_code: 'OA-003',
      outasset_number: 3,
      outasset_type: 'usage',
      outasset_applicant: { employee_name: '张三' },
      outasset_manager: { employee_name: '李四' },
    }
    const store = { getById: vi.fn(async () => detail) }
    const router = { back: vi.fn() }
    const loadEditData = createOutAssetEditLoader({
      form,
      selectedApplicant,
      selectedManager,
      originalFormData,
      isLoading,
      store,
      router,
    })
    await loadEditData('OA-003')
    expect(form.outasset_applicant_jobcode).toBe('')
    expect(form.outasset_manager_jobcode).toBe('')
    expect(form.outasset_applicant_name).toBe('张三')
    expect(form.outasset_manager_name).toBe('李四')
    expect(form.outasset_date).toBe('')
    expect(form.return_date).toBe('')
    expect(form.outasset_name).toBe('')
    expect(selectedApplicant.value).toEqual({
      value: '张三',
      employee_name: '张三',
      employee_jobcode: '',
      employee_department_name: '',
    })
    expect(selectedManager.value).toEqual({
      value: '李四',
      employee_name: '李四',
      employee_jobcode: '',
      employee_department_name: '',
    })
  })

  it('详情为空时提示未找到并返回列表', async () => {
    const { router, isLoading, loadEditData } = setup({ detail: null })
    await loadEditData('NONE')
    expect(mocks.elMessage.error).toHaveBeenCalledWith('未找到该出库记录，请返回列表重新选择')
    expect(router.back).toHaveBeenCalled()
    expect(isLoading.value).toBe(false)
  })

  it('store 异常时提示加载失败并返回列表', async () => {
    const { router, isLoading, loadEditData } = setup({ getByIdError: true })
    await loadEditData('OA-003')
    expect(mocks.elMessage.error).toHaveBeenCalledWith('加载出库记录失败，请刷新页面重试')
    expect(router.back).toHaveBeenCalled()
    expect(isLoading.value).toBe(false)
  })
})
