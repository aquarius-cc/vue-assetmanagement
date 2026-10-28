import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import AssetForm from '../AssetForm.vue'

const currentQuery: { value: Record<string, string> } = { value: {} }

const {
  mockGo,
  mockPush,
  mockAssetGetById,
  mockAssetUpdate,
  mockAssetCreate,
  mockSetRefreshFlag,
  mockTypeGetById,
  mockStorageGetById,
  mockUserGetById,
  mockContractGetByName,
  mockLoadAssociations,
  elMessage,
} = vi.hoisted(() => ({
  mockGo: vi.fn(),
  mockPush: vi.fn(),
  mockAssetGetById: vi.fn(async () => null),
  mockAssetUpdate: vi.fn(async () => ({})),
  mockAssetCreate: vi.fn(async () => [] as unknown[]),
  mockSetRefreshFlag: vi.fn(),
  mockTypeGetById: vi.fn(async () => null),
  mockStorageGetById: vi.fn(async () => null),
  mockUserGetById: vi.fn(async () => null),
  mockContractGetByName: vi.fn(async () => []),
  mockLoadAssociations: vi.fn(async () => {}),
  elMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: currentQuery.value }),
  useRouter: () => ({ push: mockPush, go: mockGo }),
}))

vi.mock('element-plus', () => ({
  ElMessage: elMessage,
}))

vi.mock('@element-plus/icons-vue', () => ({
  Edit: { template: '<span />' },
  Plus: { template: '<span />' },
}))

// [R-3/M-RC-07] AssetForm 于 onMounted 首行执行 guardOnMounted，此处放行以聚焦表单行为
vi.mock('@/composables/useOperationGuard', () => ({
  useOperationGuard: () => ({ guardOnMounted: () => true }),
}))

vi.mock('@/stores/index', () => ({
  useUserStore: () => ({ getByName: vi.fn(async () => []), getById: mockUserGetById }),
  useAssetStore: () => ({
    getById: mockAssetGetById,
    update: mockAssetUpdate,
    create: mockAssetCreate,
    setRefreshFlag: mockSetRefreshFlag,
  }),
  useAssetTypeStore: () => ({ getById: mockTypeGetById }),
  useContractStore: () => ({ getByName: mockContractGetByName, getById: vi.fn(async () => null) }),
  useStorageStore: () => ({ getById: mockStorageGetById }),
}))

vi.mock('@/composables/useAssetFormHelpers', () => ({
  useAssetFormAssociations: () => ({
    assetTypes: ref([]),
    contracts: ref([]),
    storages: ref([]),
    loadAssociations: mockLoadAssociations,
  }),
  useAssetFormAssociationMethods: () => ({}),
  useEmployeeLinkage: () => ({}),
}))

vi.mock('@/utils/Format', () => ({
  getAssetStatusText: (status: string) => status,
}))

const stubs = {
  'el-card': { template: '<div class="el-card"><slot /><slot name="header" /></div>' },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
  'el-row': { template: '<div class="el-row"><slot /></div>' },
  'el-form': {
    template: '<form class="el-form"><slot /></form>',
    methods: {
      validate(cb: (valid: boolean) => void) {
        cb(true)
      },
    },
  },
  'el-form-item': { template: '<div class="el-form-item"><slot /></div>' },
  'el-button': {
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'loading'],
    emits: ['click'],
  },
  AssetBasicInfo: {
    props: ['form', 'isEditMode', 'displayStatus', 'assetTypes', 'entryLinkage'],
    template: `<div class="basic-stub">
      <span class="f-asset-type">{{ form.asset_type }}</span>
      <span class="f-asset-type-name">{{ form.asset_type_name }}</span>
      <span class="f-entry-person">{{ form.asset_entry_person }}</span>
      <span class="f-entry-person-name">{{ form.asset_entry_person_name }}</span>
    </div>`,
  },
  AssetContractInfo: {
    props: ['form', 'contracts', 'associationMethods'],
    template: `<div class="contract-stub">
      <span class="f-asset-contract">{{ form.asset_contract }}</span>
      <span class="f-asset-contract-name">{{ form.asset_contract_name }}</span>
    </div>`,
  },
  AssetManagementInfo: {
    props: ['form', 'applicantLinkage', 'managerLinkage'],
    template: `<div class="mgmt-stub">
      <span class="f-applicant">{{ form.asset_applicant }}</span>
      <span class="f-applicant-name">{{ form.asset_applicant_name }}</span>
      <span class="f-manager">{{ form.asset_manager }}</span>
      <span class="f-manager-name">{{ form.asset_manager_name }}</span>
    </div>`,
  },
  AssetStorageInfo: {
    props: ['form', 'storages', 'associationMethods'],
    template: `<div class="storage-stub">
      <span class="f-asset-storage">{{ form.asset_storage }}</span>
      <span class="f-asset-storage-name">{{ form.asset_storage_name }}</span>
    </div>`,
  },
}

/** 对齐后端 AssetDetailSerializer 输出：仅嵌套对象，无平铺 FK 编码键 */
function makeDetail() {
  return {
    recordcode: 'REC-001',
    asset_code: 'ASSET-IT-AT001-20260101-0001',
    asset_name: '笔记本电脑',
    asset_specification: 'i7/16G',
    asset_brand: '联想',
    asset_unit: '台',
    asset_purchase_price: '4999.00',
    asset_purchase_number: '1',
    asset_purchase_date: '2026-01-01',
    asset_warranty_period: 3,
    asset_entry_date: '2026-01-02',
    asset_using_location: '3楼办公区',
    asset_description: '日常办公用',
    asset_current_status: 'in_store',
    asset_type: { type_code: 'AT001', type_name: '笔记本' },
    asset_contract: { contract_code: 'CT001', contract_name: '采购合同A' },
    asset_storage: { storage_code: 'ST001', storage_name: '主仓库' },
    asset_entry_person: { employee_jobcode: 'J001', employee_name: '张某' },
    asset_applicant: { employee_jobcode: 'J002', employee_name: '李某' },
    asset_manager: { employee_jobcode: 'J003', employee_name: '王某' },
    harddisk_sns: [],
  }
}

function mountForm() {
  return mount(AssetForm, {
    global: { stubs, directives: { loading: {} } },
  })
}

describe('AssetForm 编辑回填与提交【BF-081】', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentQuery.value = {}
    mockAssetGetById.mockResolvedValue(null)
    mockAssetUpdate.mockResolvedValue({})
    mockAssetCreate.mockResolvedValue([])
    // 关联查询端点一律 404：修复后回填不得再触碰它们
    mockTypeGetById.mockRejectedValue(new Error('404'))
    mockStorageGetById.mockRejectedValue(new Error('404'))
    mockUserGetById.mockRejectedValue(new Error('404'))
    mockContractGetByName.mockRejectedValue(new Error('404'))
  })

  it('编辑回填从嵌套对象直读 FK 编码与名称，且不发起任何关联查询', async () => {
    currentQuery.value = { code: 'REC-001' }
    mockAssetGetById.mockResolvedValue(makeDetail())

    const wrapper = mountForm()
    await flushPromises()

    expect(mockAssetGetById).toHaveBeenCalledWith('REC-001')
    const text = (sel: string) => wrapper.find(sel).text()

    // FK 编码：修复前读平铺键（detail 无该键）恒为空
    expect(text('.f-asset-type')).toBe('AT001')
    expect(text('.f-asset-storage')).toBe('ST001')
    expect(text('.f-asset-contract')).toBe('CT001')
    expect(text('.f-entry-person')).toBe('J001')
    expect(text('.f-applicant')).toBe('J002')
    expect(text('.f-manager')).toBe('J003')

    // 关联名称：直读嵌套对象，修复前经 Promise.all 关联查询（404 后整块置空）
    expect(text('.f-asset-type-name')).toBe('笔记本')
    expect(text('.f-asset-storage-name')).toBe('主仓库')
    expect(text('.f-asset-contract-name')).toBe('采购合同A')
    expect(text('.f-entry-person-name')).toBe('张某')
    expect(text('.f-applicant-name')).toBe('李某')
    expect(text('.f-manager-name')).toBe('王某')

    // 关联查询已删除：任何 store 关联 getById / getByName 均不得发起（防回归）
    expect(mockTypeGetById).not.toHaveBeenCalled()
    expect(mockStorageGetById).not.toHaveBeenCalled()
    expect(mockUserGetById).not.toHaveBeenCalled()
    expect(mockContractGetByName).not.toHaveBeenCalled()
    expect(elMessage.error).not.toHaveBeenCalledWith(
      '无法加载资产详情，请检查网络连接后刷新页面重试',
    )
  })

  it('编辑提交 payload 使用回填捕获的 recordcode 定位，FK 值为回填后的业务码，且剔除录入倍数', async () => {
    currentQuery.value = { code: 'REC-001' }
    mockAssetGetById.mockResolvedValue(makeDetail())

    const wrapper = mountForm()
    await flushPromises()

    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('提交'))
    expect(submitBtn).toBeTruthy()
    await submitBtn!.trigger('click')

    await vi.waitFor(() => expect(mockAssetUpdate).toHaveBeenCalled())
    const payload = mockAssetUpdate.mock.calls[0][0] as Record<string, unknown>

    expect(payload).toHaveProperty('recordcode', 'REC-001')
    expect(payload).toHaveProperty('asset_name', '笔记本电脑')
    // FK 编码取自回填结果（修复前回填为空）
    expect(payload).toHaveProperty('asset_type', 'AT001')
    expect(payload).toHaveProperty('asset_storage', 'ST001')
    expect(payload).toHaveProperty('asset_contract', 'CT001')
    expect(payload).toHaveProperty('asset_entry_person', 'J001')
    // 录入倍数为后端禁改字段，编辑载荷必须剔除
    expect(payload).not.toHaveProperty('asset_purchase_number')
    expect(mockSetRefreshFlag).toHaveBeenCalledWith(true)
    expect(mockGo).toHaveBeenCalledWith(-1)
    expect(elMessage.success).toHaveBeenCalledWith('更新成功')
  })

  it('新增模式提交不携带 recordcode 且不请求详情', async () => {
    const wrapper = mountForm()
    await flushPromises()

    expect(mockAssetGetById).not.toHaveBeenCalled()

    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('提交'))
    await submitBtn!.trigger('click')

    await vi.waitFor(() => expect(mockAssetCreate).toHaveBeenCalled())
    const payload = mockAssetCreate.mock.calls[0][0] as Record<string, unknown>
    expect(payload).not.toHaveProperty('recordcode')
    expect(elMessage.success).toHaveBeenCalledWith(expect.stringContaining('录入成功'))
  })

  it('编辑提交失败：update 抛错时不导航、不置刷新标志（M-5 回归屏障）', async () => {
    // M-5 缺陷类：submitUpdate 失败后 submitForm 不得继续 setRefreshFlag/router.go(-1)。
    // recordcode 缺失防御分支被 isEditMode（!!route.query.code）网关保护、常规不可达，
    // 本用例锁定其 throw 语义的可达等价面：任何 submitUpdate 失败均阻断导航。
    currentQuery.value = { code: 'REC-001' }
    mockAssetGetById.mockResolvedValue(makeDetail())
    mockAssetUpdate.mockRejectedValue(new Error('network down'))

    const wrapper = mountForm()
    await flushPromises()

    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('提交'))
    await submitBtn!.trigger('click')
    await vi.waitFor(() => expect(elMessage.error).toHaveBeenCalled())

    expect(mockGo).not.toHaveBeenCalled()
    expect(mockSetRefreshFlag).not.toHaveBeenCalled()
  })
})
