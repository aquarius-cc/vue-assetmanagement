import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import AssetForm from '../AssetForm.vue'

const currentQuery: { value: Record<string, string> } = { value: {} }

const {
  mockGo,
  mockPush,
  mockAssetGetByIdFresh,
  mockAssetUpdate,
  mockAssetCreate,
  mockSetRefreshFlag,
  mockTypeGetById,
  mockStorageGetById,
  mockUserGetById,
  mockContractGetByName,
  mockLoadAssociations,
  mockHandoff,
  mockGuardOnMounted,
  elMessage,
  mockConfirm,
  mockInvalidateAssetCache,
} = vi.hoisted(() => ({
  mockGo: vi.fn(),
  mockPush: vi.fn(),
  mockAssetGetByIdFresh: vi.fn(async () => null),
  mockAssetUpdate: vi.fn(async () => ({})),
  mockAssetCreate: vi.fn(async () => [] as unknown[]),
  mockSetRefreshFlag: vi.fn(),
  mockTypeGetById: vi.fn(async () => null),
  mockStorageGetById: vi.fn(async () => null),
  mockUserGetById: vi.fn(async () => null),
  mockContractGetByName: vi.fn(async () => []),
  mockLoadAssociations: vi.fn(async () => {}),
  mockHandoff: { seed: vi.fn(), consume: vi.fn(() => null), clear: vi.fn() },
  mockGuardOnMounted: { value: true },
  elMessage: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  mockConfirm: vi.fn(),
  mockInvalidateAssetCache: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: currentQuery.value }),
  useRouter: () => ({ push: mockPush, go: mockGo }),
}))

vi.mock('element-plus', () => ({
  ElMessage: elMessage,
  ElMessageBox: { confirm: mockConfirm },
}))

vi.mock('@element-plus/icons-vue', () => ({
  Edit: { template: '<span />' },
  Plus: { template: '<span />' },
}))

// [R-3/M-RC-07] AssetForm 于 onMounted 首行执行 guardOnMounted，此处放行以聚焦表单行为
vi.mock('@/composables/useOperationGuard', () => ({
  useOperationGuard: () => ({ guardOnMounted: () => mockGuardOnMounted.value }),
}))

vi.mock('@/composables/useAssetDetailHandoff', () => ({
  useAssetDetailHandoff: () => mockHandoff,
}))

vi.mock('@/stores/index', () => ({
  useUserStore: () => ({ getByName: vi.fn(async () => []), getById: mockUserGetById }),
  useAssetStore: () => ({
    getByIdFresh: mockAssetGetByIdFresh,
    invalidateAssetCache: mockInvalidateAssetCache,
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
      <span class="f-asset-name">{{ form.asset_name }}</span>
      <input class="f-name-input" :value="form.asset_name" @input="form.asset_name = $event.target.value" />
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
    version: 5,
    asset_type: { type_code: 'AT001', type_name: '笔记本' },
    asset_contract: { contract_code: 'CT001', contract_name: '采购合同A' },
    asset_storage: { storage_code: 'ST001', storage_name: '主仓库' },
    asset_entry_person: { employee_jobcode: 'J001', employee_name: '张某' },
    asset_applicant: { employee_jobcode: 'J002', employee_name: '李某' },
    asset_manager: { employee_jobcode: 'J003', employee_name: '王某' },
    harddisk_sns: [],
  }
}

/** v-loading 桩：把绑定值写成 data-loading，便于断言 isBootstrapping 状态 */
const loadingDirective = {
  mounted(el: HTMLElement, binding: { value: unknown }) {
    el.setAttribute('data-loading', String(binding.value))
  },
  updated(el: HTMLElement, binding: { value: unknown }) {
    el.setAttribute('data-loading', String(binding.value))
  },
}

function mountForm() {
  return mount(AssetForm, {
    global: { stubs, directives: { loading: loadingDirective } },
  })
}

describe('AssetForm 编辑回填与提交【BF-081】', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentQuery.value = {}
    mockAssetGetByIdFresh.mockResolvedValue(null)
    mockAssetUpdate.mockResolvedValue({})
    mockAssetCreate.mockResolvedValue([])
    // 关联查询端点一律 404：修复后回填不得再触碰它们
    mockTypeGetById.mockRejectedValue(new Error('404'))
    mockStorageGetById.mockRejectedValue(new Error('404'))
    mockUserGetById.mockRejectedValue(new Error('404'))
    mockContractGetByName.mockRejectedValue(new Error('404'))
    mockHandoff.consume.mockReturnValue(null)
    mockGuardOnMounted.value = true
  })

  it('编辑回填从嵌套对象直读 FK 编码与名称，且不发起任何关联查询', async () => {
    currentQuery.value = { code: 'REC-001' }
    mockAssetGetByIdFresh.mockResolvedValue(makeDetail())

    const wrapper = mountForm()
    await flushPromises()

    expect(mockAssetGetByIdFresh).toHaveBeenCalledWith('REC-001')
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
    mockAssetGetByIdFresh.mockResolvedValue(makeDetail())

    const wrapper = mountForm()
    await flushPromises()

    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('提交'))
    expect(submitBtn).toBeTruthy()
    await submitBtn!.trigger('click')

    await vi.waitFor(() => expect(mockAssetUpdate).toHaveBeenCalled())
    const payload = mockAssetUpdate.mock.calls[0][0] as Record<string, unknown>

    expect(payload).toHaveProperty('recordcode', 'REC-001')
    expect(payload).toHaveProperty('asset_name', '笔记本电脑')
    // 乐观锁 CAS 令牌：载荷必带加载时的版本快照
    expect(payload).toHaveProperty('version', 5)
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

    expect(mockAssetGetByIdFresh).not.toHaveBeenCalled()

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
    mockAssetGetByIdFresh.mockResolvedValue(makeDetail())
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

describe('AssetForm 交接消费与加载遮罩', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentQuery.value = { code: 'REC-001' }
    mockAssetGetByIdFresh.mockResolvedValue(makeDetail())
    mockLoadAssociations.mockResolvedValue(undefined)
    mockHandoff.consume.mockReturnValue(null)
    mockGuardOnMounted.value = true
  })

  it('命中交接：字段即时回填（不等补拉网络），静默校验后台补拉最新', async () => {
    mockHandoff.consume.mockReturnValue(makeDetail() as never)
    // 静默校验的补拉请求挂起：断言即时回填不依赖其返回
    mockAssetGetByIdFresh.mockReturnValue(new Promise<null>(() => {}))

    const wrapper = mountForm()
    await flushPromises()

    expect(mockHandoff.consume).toHaveBeenCalledWith('REC-001')
    expect(wrapper.find('.f-asset-type').text()).toBe('AT001')
    expect(wrapper.find('.f-asset-name').text()).toBe('笔记本电脑')
    // 预载分支除外的陈旧风险由 409 绝对兜底；此处补拉一次做静默校验
    expect(mockAssetGetByIdFresh).toHaveBeenCalledTimes(1)
  })

  it('未命中交接：回退 getByIdFresh 回填', async () => {
    const wrapper = mountForm()
    await flushPromises()

    expect(mockAssetGetByIdFresh).toHaveBeenCalledWith('REC-001')
    expect(wrapper.find('.f-asset-type').text()).toBe('AT001')
  })

  it('加载完成后 isBootstrapping 复位（v-loading 关闭）', async () => {
    let resolveAssociations!: () => void
    mockLoadAssociations.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAssociations = resolve
        }),
    )

    const wrapper = mountForm()
    await Promise.resolve()
    expect(wrapper.find('.asset-form').attributes('data-loading')).toBe('true')

    resolveAssociations()
    await flushPromises()
    expect(wrapper.find('.asset-form').attributes('data-loading')).toBe('false')
  })

  it('guardOnMounted=false 早退时仍复位遮罩', async () => {
    mockGuardOnMounted.value = false
    const wrapper = mountForm()
    await flushPromises()

    expect(wrapper.find('.asset-form').attributes('data-loading')).toBe('false')
    expect(mockHandoff.consume).not.toHaveBeenCalled()
  })

  it('resetForm 不传 preloaded，仍走 getByIdFresh（重置即打网，不走缓存）', async () => {
    mockHandoff.consume.mockReturnValue(makeDetail() as never)
    const wrapper = mountForm()
    await flushPromises()
    // 预载命中后静默校验已补拉 1 次；重置须再次打网，不得被缓存短路
    expect(mockAssetGetByIdFresh).toHaveBeenCalledTimes(1)

    const resetBtn = wrapper.findAll('button').find((b) => b.text().includes('重置'))
    expect(resetBtn).toBeTruthy()
    await resetBtn!.trigger('click')
    await flushPromises()

    expect(mockAssetGetByIdFresh).toHaveBeenCalledTimes(2)
    expect(mockAssetGetByIdFresh).toHaveBeenLastCalledWith('REC-001')
  })

  it('非预载路径打开即打网，二次进入仍打网（不命中缓存）', async () => {
    currentQuery.value = { code: 'REC-001' }
    mockHandoff.consume.mockReturnValue(null)
    mockAssetGetByIdFresh.mockResolvedValue(makeDetail())

    const first = mountForm()
    await flushPromises()
    expect(mockAssetGetByIdFresh).toHaveBeenCalledTimes(1)
    first.unmount()

    // 二次进入：getByIdFresh 每次都走网络（useCache:false），不得被首次结果缓存短路
    mockAssetGetByIdFresh.mockClear()
    const second = mountForm()
    await flushPromises()
    expect(mockAssetGetByIdFresh).toHaveBeenCalledTimes(1)
    expect(mockAssetGetByIdFresh).toHaveBeenCalledWith('REC-001')
    second.unmount()
  })
})

describe('AssetForm 预载静默校验【乐观锁】', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentQuery.value = { code: 'REC-001' }
    mockLoadAssociations.mockResolvedValue(undefined)
    mockHandoff.consume.mockReturnValue(makeDetail() as never)
    mockGuardOnMounted.value = true
    mockAssetUpdate.mockResolvedValue({})
  })

  it('一致：静默失效缓存副本，表单保留预载值', async () => {
    mockAssetGetByIdFresh.mockResolvedValue(makeDetail()) // v5 == 预载 v5

    const wrapper = mountForm()
    await flushPromises()

    expect(mockAssetGetByIdFresh).toHaveBeenCalledTimes(1)
    expect(mockInvalidateAssetCache).toHaveBeenCalledWith('REC-001')
    expect(wrapper.find('.f-asset-name').text()).toBe('笔记本电脑')
  })

  it('不一致且未编辑：平滑替换为最新（值与版本、基线同步更新）', async () => {
    const latest = { ...makeDetail(), version: 6, asset_name: '他人改名' }
    mockAssetGetByIdFresh.mockResolvedValue(latest)

    const wrapper = mountForm()
    await flushPromises()
    expect(wrapper.find('.f-asset-name').text()).toBe('他人改名')
    expect(mockInvalidateAssetCache).not.toHaveBeenCalled()

    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('提交'))
    await submitBtn!.trigger('click')
    await vi.waitFor(() => expect(mockAssetUpdate).toHaveBeenCalled())
    const payload = mockAssetUpdate.mock.calls[0][0] as Record<string, unknown>
    expect(payload).toHaveProperty('version', 6)
    expect(payload).toHaveProperty('asset_name', '他人改名')
  })

  it('不一致且已编辑：仅提示，保留用户修改不替换', async () => {
    let resolveFresh!: (v: unknown) => void
    mockAssetGetByIdFresh.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFresh = resolve
        }),
    )
    const wrapper = mountForm()
    await flushPromises()
    await wrapper.find('.f-name-input').setValue('我的改名')
    resolveFresh({ ...makeDetail(), version: 6, asset_name: '他人改名' })
    await flushPromises()

    expect(elMessage.info).toHaveBeenCalledWith('该资产数据刚被他人更新，提交时如有冲突将提示处理')
    expect(wrapper.find('.f-asset-name').text()).toBe('我的改名')
    expect(mockInvalidateAssetCache).not.toHaveBeenCalled()
  })
})

describe('AssetForm 409 VERSION_CONFLICT 人机协同', () => {
  const versionConflictError = () =>
    Object.assign(new Error('conflict'), {
      response: {
        status: 409,
        data: { code: 409, message: 'conflict', data: { error_code: 'VERSION_CONFLICT' } },
      },
    })

  beforeEach(() => {
    vi.clearAllMocks()
    currentQuery.value = { code: 'REC-001' }
    mockLoadAssociations.mockResolvedValue(undefined)
    mockHandoff.consume.mockReturnValue(null)
    mockAssetGetByIdFresh.mockResolvedValue(makeDetail()) // v5
    mockAssetUpdate.mockResolvedValue({})
    mockConfirm.mockResolvedValue(undefined) // 默认「保留我的修改」
    mockGuardOnMounted.value = true
  })

  const mountAndSubmit = async () => {
    const wrapper = mountForm()
    await flushPromises()
    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('提交'))
    await submitBtn!.trigger('click')
    await flushPromises()
    return wrapper
  }

  it('保留我的修改：合并载荷 = 最新归一化 + 脏字段覆盖 + 最新版本号', async () => {
    mockAssetUpdate.mockRejectedValueOnce(versionConflictError())
    // 首拉 v5 → 冲突后合并拉 v6（他人改了 name 与 brand）
    mockAssetGetByIdFresh.mockResolvedValueOnce(makeDetail()).mockResolvedValueOnce({
      ...makeDetail(),
      version: 6,
      asset_name: '他人改名',
      asset_brand: '华为',
    })

    const wrapper = mountForm()
    await flushPromises()
    await wrapper.find('.f-name-input').setValue('我的改名') // 仅脏 asset_name
    const submitBtn = wrapper.findAll('button').find((b) => b.text().includes('提交'))
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalledTimes(1)
    expect(mockAssetUpdate).toHaveBeenCalledTimes(2)
    const merged = mockAssetUpdate.mock.calls[1][0] as Record<string, unknown>
    expect(merged).toHaveProperty('version', 6) // 最新版本号
    expect(merged).toHaveProperty('asset_name', '我的改名') // 脏字段保留
    expect(merged).toHaveProperty('asset_brand', '华为') // 未动字段让位给他人修改
    expect(merged).not.toHaveProperty('asset_purchase_number')
    expect(mockGo).toHaveBeenCalledWith(-1)
    expect(elMessage.success).toHaveBeenCalledWith('更新成功（已合并他人修改）')
  })

  it('刷新看最新：放弃修改回填最新，不重试不导航', async () => {
    mockAssetUpdate.mockRejectedValueOnce(versionConflictError())
    mockAssetGetByIdFresh
      .mockResolvedValueOnce(makeDetail())
      .mockResolvedValueOnce({ ...makeDetail(), version: 6, asset_name: '他人改名' })
    mockConfirm.mockRejectedValueOnce('cancel') // 取消 = 刷新看最新

    const wrapper = await mountAndSubmit()

    expect(mockAssetUpdate).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.f-asset-name').text()).toBe('他人改名')
    expect(elMessage.info).toHaveBeenCalledWith('已刷新为最新数据，请确认后重新提交')
    expect(mockGo).not.toHaveBeenCalled()
    expect(mockSetRefreshFlag).not.toHaveBeenCalled()
  })

  it('合并后再 409：重新弹窗，人工再次选择后成功', async () => {
    mockAssetUpdate
      .mockRejectedValueOnce(versionConflictError())
      .mockRejectedValueOnce(versionConflictError())
    mockAssetGetByIdFresh
      .mockResolvedValueOnce(makeDetail())
      .mockResolvedValueOnce({ ...makeDetail(), version: 6 })
      .mockResolvedValueOnce({ ...makeDetail(), version: 7 })

    await mountAndSubmit()

    // 每次重试均需人工选择（confirm 两次），不自动无限重试
    expect(mockConfirm).toHaveBeenCalledTimes(2)
    expect(mockAssetUpdate).toHaveBeenCalledTimes(3)
    expect(mockAssetUpdate.mock.calls[2][0]).toHaveProperty('version', 7)
    expect(mockGo).toHaveBeenCalledWith(-1)
  })

  it('关闭弹窗：放弃提交留在编辑页', async () => {
    mockAssetUpdate.mockRejectedValueOnce(versionConflictError())
    mockConfirm.mockRejectedValueOnce('close')

    await mountAndSubmit()

    expect(mockAssetUpdate).toHaveBeenCalledTimes(1)
    expect(mockGo).not.toHaveBeenCalled()
  })

  it('非 VERSION_CONFLICT 业务码的 409 不弹专属弹窗（判别不可与 HTTP 码混同）', async () => {
    mockAssetUpdate.mockRejectedValueOnce(
      Object.assign(new Error('conflict'), {
        response: {
          status: 409,
          data: { code: 409, message: 'conflict', data: { error_code: 'OTHER' } },
        },
      }),
    )

    await mountAndSubmit()

    expect(mockConfirm).not.toHaveBeenCalled()
    expect(mockAssetUpdate).toHaveBeenCalledTimes(1)
    expect(mockGo).not.toHaveBeenCalled()
  })

  it('仅信封 code=409（无 VERSION_CONFLICT 业务码）同样不弹专属弹窗', async () => {
    mockAssetUpdate.mockRejectedValueOnce(
      Object.assign(new Error('conflict'), {
        response: { status: 409, data: { code: 409, message: 'conflict', data: {} } },
      }),
    )

    await mountAndSubmit()

    expect(mockConfirm).not.toHaveBeenCalled()
    expect(mockAssetUpdate).toHaveBeenCalledTimes(1)
    expect(mockGo).not.toHaveBeenCalled()
  })
})
