import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BasicAssetDetails from '../BasicAssetDetails.vue'

const currentQuery: { value: Record<string, string> } = { value: {} }

const {
  mockPush,
  mockGo,
  mockGetById,
  mockGetQrCodeImageUrl,
  mockHandoff,
  elMessage,
  permissionState,
} = vi.hoisted(() => ({
  mockPush: vi.fn(() => Promise.resolve()),
  mockGo: vi.fn(),
  mockGetById: vi.fn(async () => null),
  mockGetQrCodeImageUrl: vi.fn(() => 'https://example.com/qr.png'),
  mockHandoff: { seed: vi.fn(), consume: vi.fn(() => null), clear: vi.fn() },
  elMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  permissionState: { canOperateAsset: false },
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
  Download: { template: '<span />' },
  Back: { template: '<span />' },
  Loading: { template: '<span />' },
  Timer: { template: '<span />' },
}))

vi.mock('@/stores/assetStore', () => ({
  useAssetStore: () => ({
    getById: mockGetById,
    getQrCodeImageUrl: mockGetQrCodeImageUrl,
  }),
}))

vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
}))

vi.mock('@/composables/usePermission', () => ({
  usePermission: () => ({ canOperateAsset: permissionState.canOperateAsset }),
}))

vi.mock('@/composables/useExcelExport', () => ({
  useExcelExport: () => ({ exportDetail: vi.fn() }),
}))

vi.mock('@/composables/useAssetDetailHandoff', () => ({
  useAssetDetailHandoff: () => mockHandoff,
}))

const stubs = {
  'el-button': {
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'icon', 'size'],
    emits: ['click'],
  },
  'el-card': {
    template: '<div class="el-card"><slot name="header" /><slot /></div>',
    props: ['bodyStyle'],
  },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
  InfoCard: { props: ['config'], template: '<div class="info-card-stub" />' },
  HardDiskSNCard: { props: ['harddiskSns', 'assetCode'], template: '<div class="hd-stub" />' },
  StatusTag: { props: ['status', 'size'], template: '<span class="status-stub"><slot /></span>' },
  'el-skeleton': { template: '<div class="skeleton-stub" />' },
  'el-empty': { template: '<div class="empty-stub" />' },
}

function makeDetail() {
  return {
    recordcode: 'REC-001',
    asset_code: 'ASSET-IT-AT001-20260101-0001',
    asset_name: '笔记本电脑',
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

function mountDetail() {
  return mount(BasicAssetDetails, {
    global: { stubs, directives: { loading: {} } },
  })
}

describe('BasicAssetDetails 操作跳转取键【BF-081 连带】', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 本 describe 锚的是 recordcode 取键契约，非权限；编辑按钮需可见故置为有权限
    permissionState.canOperateAsset = true
    currentQuery.value = { code: 'REC-001' }
    mockGetById.mockResolvedValue(makeDetail())
  })

  it('详情加载使用路由 code（recordcode）定位，渲染后「编辑」以 recordcode 进入编辑页', async () => {
    const wrapper = mountDetail()
    await flushPromises()

    expect(mockGetById).toHaveBeenCalledWith('REC-001')

    const editBtn = wrapper.findAll('button').find((b) => b.text().includes('编辑'))
    expect(editBtn).toBeTruthy()
    await editBtn!.trigger('click')

    // ID-2 取键契约：AssetForm 的 loadAssetDetail 按 recordcode 定位（传 asset_code 必 404）
    expect(mockPush).toHaveBeenCalledWith({
      name: 'AssetForm',
      query: { code: 'REC-001' },
    })
  })

  it('无操作权限时「编辑」按钮不渲染【R-3/M-RC-07】', async () => {
    permissionState.canOperateAsset = false
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.findAll('button').find((b) => b.text().includes('编辑'))).toBeUndefined()
    // 只读入口不受影响
    expect(wrapper.findAll('button').find((b) => b.text().includes('状态日志'))).toBeTruthy()
  })

  it('「状态日志」以 recordcode 进入日志页（既有契约回归）', async () => {
    const wrapper = mountDetail()
    await flushPromises()

    const logsBtn = wrapper.findAll('button').find((b) => b.text().includes('状态日志'))
    expect(logsBtn).toBeTruthy()
    await logsBtn!.trigger('click')

    expect(mockPush).toHaveBeenCalledWith({ name: 'AssetLogs', params: { code: 'REC-001' } })
  })

  it('详情缺失时提示警告', async () => {
    mockGetById.mockResolvedValue(null)
    mountDetail()
    await flushPromises()

    expect(elMessage.warning).toHaveBeenCalledWith('未找到资产编码为 REC-001 的资产')
  })
})

describe('BasicAssetDetails 出库/回收按钮', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissionState.canOperateAsset = true
  })

  it('in_store 资产显示「出库」按钮，点击以 query.asset 传 recordcode', async () => {
    currentQuery.value = { code: 'REC-001' }
    mockGetById.mockResolvedValue({ ...makeDetail(), asset_current_status: 'in_store' })
    const wrapper = mountDetail()
    await flushPromises()

    const outBtn = wrapper.findAll('button').find((b) => b.text().includes('出库'))
    expect(outBtn).toBeTruthy()
    expect(wrapper.findAll('button').find((b) => b.text().includes('回收'))).toBeUndefined()

    await outBtn!.trigger('click')
    expect(mockPush).toHaveBeenCalledWith({
      name: 'OutAssetForm',
      query: { asset: 'REC-001' },
    })
  })

  it('in_use 资产显示「回收」按钮，点击以 params.code 传 recordcode', async () => {
    currentQuery.value = { code: 'REC-001' }
    mockGetById.mockResolvedValue({ ...makeDetail(), asset_current_status: 'in_use' })
    const wrapper = mountDetail()
    await flushPromises()

    const recycleBtn = wrapper.findAll('button').find((b) => b.text().includes('回收'))
    expect(recycleBtn).toBeTruthy()
    expect(wrapper.findAll('button').find((b) => b.text().includes('出库'))).toBeUndefined()

    await recycleBtn!.trigger('click')
    expect(mockPush).toHaveBeenCalledWith({
      name: 'RecycleAsset',
      params: { code: 'REC-001' },
    })
  })

  it('无权限时出库/回收按钮均不渲染', async () => {
    permissionState.canOperateAsset = false
    currentQuery.value = { code: 'REC-001' }
    mockGetById.mockResolvedValue({ ...makeDetail(), asset_current_status: 'in_store' })
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.findAll('button').find((b) => b.text().includes('出库'))).toBeUndefined()
    expect(wrapper.findAll('button').find((b) => b.text().includes('回收'))).toBeUndefined()
  })
})

describe('BasicAssetDetails 交接消费与来源标志', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissionState.canOperateAsset = true
    currentQuery.value = { code: 'REC-001' }
    mockGetById.mockResolvedValue(makeDetail())
    mockHandoff.consume.mockReturnValue(null)
  })

  const editButton = async () => {
    const wrapper = mountDetail()
    await flushPromises()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('编辑'))
    expect(btn).toBeTruthy()
    return btn!
  }

  it('setup 命中交接：首帧渲染详情、零骨架帧、getById 零调用', async () => {
    const seeded = makeDetail()
    mockHandoff.consume.mockReturnValue(seeded as never)

    const wrapper = mountDetail()
    // 不 await flushPromises：首帧即断言
    expect(mockHandoff.consume).toHaveBeenCalledWith('REC-001')
    expect(wrapper.find('.loading-container').exists()).toBe(false)
    expect(wrapper.find('.asset-detail-container').exists()).toBe(true)
    expect(mockGetById).not.toHaveBeenCalled()
  })

  it('交接来源的详情点编辑不播种（防陈旧回灌）', async () => {
    mockHandoff.consume.mockReturnValue(makeDetail() as never)
    const btn = await editButton()

    await btn.trigger('click')
    expect(mockHandoff.seed).not.toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith({ name: 'AssetForm', query: { code: 'REC-001' } })
  })

  it('getById 来源的详情点编辑播种，导航失败时按 didSeed 清理', async () => {
    const btn = await editButton()
    await btn.trigger('click')

    expect(mockGetById).toHaveBeenCalledWith('REC-001')
    expect(mockHandoff.seed).toHaveBeenCalledTimes(1)
    expect(mockHandoff.seed).toHaveBeenCalledWith(
      expect.objectContaining({ recordcode: 'REC-001' }),
    )

    // 导航失败（push resolve 非 falsy failure）按 didSeed 清理
    mockPush.mockResolvedValueOnce({ type: 16 } as never)
    await btn.trigger('click')
    expect(mockHandoff.clear).toHaveBeenCalledWith('REC-001')
  })
})
