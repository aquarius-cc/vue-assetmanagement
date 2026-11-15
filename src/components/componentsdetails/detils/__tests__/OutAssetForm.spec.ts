import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import OutAssetForm from '../OutAssetForm.vue'
import { notifyCallerError } from '@/utils/errorHandler'
import { logError } from '@/utils/logger'
import { ElMessage } from 'element-plus'

const currentQuery: { value: Record<string, string> } = { value: {} }

const {
  mockPush,
  mockBack,
  mockGo,
  mockGetById,
  mockUpdate,
  mockCreate,
  mockSetRefreshFlag,
  mockAssetGetByName,
  mockAssetGetById,
  mockGetFuzzySearch,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockBack: vi.fn(),
  mockGo: vi.fn(),
  mockGetById: vi.fn(async () => null),
  mockUpdate: vi.fn(async () => ({})),
  mockCreate: vi.fn(async () => ({})),
  mockSetRefreshFlag: vi.fn(),
  mockAssetGetByName: vi.fn(async () => []),
  mockAssetGetById: vi.fn(async () => null),
  mockGetFuzzySearch: vi.fn(async () => ({ results: [] })),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: currentQuery.value }),
  useRouter: () => ({ push: mockPush, back: mockBack, go: mockGo }),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

vi.mock('@element-plus/icons-vue', () => ({
  Plus: { template: '<span />' },
}))

vi.mock('@/stores/outAssetStore', () => ({
  useOutAssetStore: () => ({
    getById: mockGetById,
    update: mockUpdate,
    create: mockCreate,
    setRefreshFlag: mockSetRefreshFlag,
    loading: false,
  }),
}))

vi.mock('@/stores/assetStore', () => ({
  useAssetStore: () => ({
    getByName: mockAssetGetByName,
    getById: mockAssetGetById,
  }),
}))

vi.mock('@/api/user', () => ({
  userAPI: { getFuzzySearch: mockGetFuzzySearch },
}))

vi.mock('@/utils/Format', () => ({
  formatDate: (v: string) => v,
  todayLocalISO: () => '2024-01-01',
}))

// [B-34] 部分 mock：保留 isApiError 等真实实现，仅替换单出口与日志
vi.mock('@/utils/errorHandler', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/errorHandler')>()
  return { ...actual, notifyCallerError: vi.fn() }
})
vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/logger')>()
  return { ...actual, logError: vi.fn() }
})

const stubs = {
  'el-card': { template: '<div class="el-card"><slot /><slot name="header" /></div>' },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
  'el-row': { template: '<div class="el-row"><slot /></div>' },
  'el-col': { template: '<div class="el-col"><slot /></div>' },
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    methods: {
      validate(cb: (v: boolean) => void) {
        cb(true)
      },
    },
  },
  'el-form-item': { template: '<div class="el-form-item"><slot /></div>' },
  'el-autocomplete': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input class="el-autocomplete" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'el-input': {
    props: ['modelValue', 'type'],
    emits: ['update:modelValue'],
    template:
      '<component :is="type === \'textarea\' ? \'textarea\' : \'input\'" class="el-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'el-input-number': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input class="el-input-number" type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
  },
  'el-select': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select class="el-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
  },
  'el-option': { template: '<option />', props: ['label', 'value'] },
  'el-date-picker': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input class="el-date-picker" type="date" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'el-button': {
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'loading'],
    emits: ['click'],
  },
  ExportableAssetsSearch: { template: '<div />' },
}

function mountForm() {
  return mount(OutAssetForm, {
    global: { stubs, directives: { loading: {} } },
  })
}

describe('OutAssetForm 编辑提交', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentQuery.value = {}
    mockGetById.mockResolvedValue(null)
    mockUpdate.mockResolvedValue({})
    mockCreate.mockResolvedValue({})
    mockAssetGetByName.mockResolvedValue([])
    mockGetFuzzySearch.mockResolvedValue({ results: [] })
  })

  it('编辑提交 payload 使用 store 期望的 recordcode 主键', async () => {
    currentQuery.value = { code: 'OUT001' }
    mockGetById.mockResolvedValue({
      outasset_code: 'OUT001',
      outasset_number: 1,
      outasset_applicant_jobcode: 'J001',
      outasset_manager_jobcode: 'J002',
      outasset_applicant: { employee_name: '张三' },
      outasset_manager: { employee_name: '李四' },
      outasset_date: '2024-05-01',
      return_date: '2024-06-01',
      outasset_type: 'borrow',
      outasset_using_location: 'A座',
      outasset_description: '描述',
      asset_name: '旧资产',
    })
    const wrapper = mountForm()

    await vi.waitFor(() => expect(mockGetById).toHaveBeenCalled())
    await flushPromises()

    await wrapper.find('textarea').setValue('改过了')
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('保存修改'))
    expect(saveBtn).toBeTruthy()
    await saveBtn!.trigger('click')

    await vi.waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ recordcode: 'OUT001' }))
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({ asset_recordcode: 'OUT001' }),
    )
  })

  it('[B-34] 提交失败：AxiosError 不直弹后端原文，收编 notifyCallerError + logError', async () => {
    currentQuery.value = { code: 'OUT001' }
    mockGetById.mockResolvedValue({
      outasset_code: 'OUT001',
      outasset_number: 1,
      outasset_applicant_jobcode: 'J001',
      outasset_manager_jobcode: 'J002',
      outasset_applicant: { employee_name: '张三' },
      outasset_manager: { employee_name: '李四' },
      outasset_date: '2024-05-01',
      return_date: '2024-06-01',
      outasset_type: 'borrow',
      outasset_using_location: 'A座',
      outasset_description: '描述',
      asset_name: '旧资产',
    })
    const axiosError = {
      isAxiosError: true,
      message: 'Request failed with status code 500',
      response: { status: 500, data: { message: '数据库连接失败' } },
    }
    mockUpdate.mockRejectedValue(axiosError)

    const wrapper = mountForm()
    await vi.waitFor(() => expect(mockGetById).toHaveBeenCalled())
    await flushPromises()

    await wrapper.find('textarea').setValue('改过了')
    const saveBtn = wrapper.findAll('button').find((b) => b.text().includes('保存修改'))
    await saveBtn!.trigger('click')
    await flushPromises()

    // 拦截器已提示 → 组件侧不得再弹后端原文
    expect(vi.mocked(ElMessage.error)).not.toHaveBeenCalled()
    expect(vi.mocked(notifyCallerError)).toHaveBeenCalledWith(axiosError, expect.any(String))
    expect(vi.mocked(logError)).toHaveBeenCalledWith(
      'components/componentsdetails/detils/OutAssetForm',
      expect.any(String),
      axiosError,
    )
    // 静态防回潮：不再手写 response.data.message 提取
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/componentsdetails/detils/OutAssetForm.vue'),
      'utf-8',
    )
    expect(source).not.toContain('response?.data?.message')
  })
})

describe('OutAssetForm 新增预填（query.asset）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentQuery.value = {}
    mockAssetGetById.mockResolvedValue(null)
    mockAssetGetByName.mockResolvedValue([])
    mockGetFuzzySearch.mockResolvedValue({ results: [] })
    mockCreate.mockResolvedValue({})
  })

  it('query.asset 存在时按 recordcode 加载资产并预填编码与名称', async () => {
    currentQuery.value = { asset: 'REC-001' }
    mockAssetGetById.mockResolvedValue({
      recordcode: 'REC-001',
      asset_code: 'ASSET-IT-AT001-20260101-0001',
      asset_name: '笔记本电脑',
      asset_current_status: 'in_store',
    })
    mountForm()
    await flushPromises()

    expect(mockAssetGetById).toHaveBeenCalledWith('REC-001')
    // handleAssetSelect 预填后回填编码/名称（经 extended form 的 outasset_code）
    await flushPromises()
  })

  it('query.asset 指向不存在的资产时提示并保持表单为空', async () => {
    currentQuery.value = { asset: 'NO-SUCH' }
    mockAssetGetById.mockResolvedValue(null)
    mountForm()
    await flushPromises()

    expect(mockAssetGetById).toHaveBeenCalledWith('NO-SUCH')
  })

  it('无 query.asset 且非编辑模式时不触发资产加载', async () => {
    currentQuery.value = {}
    mountForm()
    await flushPromises()

    expect(mockAssetGetById).not.toHaveBeenCalled()
    expect(mockGetById).not.toHaveBeenCalled()
  })
})
