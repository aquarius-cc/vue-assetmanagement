import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ScanAssetView from '../ScanAssetView.vue'

// 路由 mock：固定扫码页参数
const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { recordcode: 'REC-2024-0001' }, fullPath: '/scan/REC-2024-0001' }),
  useRouter: () => ({ push: pushMock }),
}))

// 登录态 mock（组件读 useAuthStore().isLoggedIn，守卫已保证进入前初始化）
let mockIsLoggedIn = false
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get isLoggedIn() {
      return mockIsLoggedIn
    },
  }),
}))

// 公开接口 mock：组件经 assetStore.fetchPublicScanAsset 访问（FE-01 分层，组件不直连 api）
const fetchPublicScanAssetMock = vi.fn()
vi.mock('@/stores/assetStore', () => ({
  useAssetStore: () => ({
    fetchPublicScanAsset: fetchPublicScanAssetMock,
  }),
}))

const { elMessageError } = vi.hoisted(() => ({ elMessageError: vi.fn() }))
vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), warning: vi.fn(), error: elMessageError },
}))

const stubs = {
  'el-card': { template: '<div class="el-card"><slot name="header" /><slot /></div>' },
  'el-result': {
    template:
      '<div class="el-result"><span class="result-title">{{ title }}</span><span class="result-sub">{{ subTitle }}</span><slot name="extra" /></div>',
    props: ['icon', 'title', 'subTitle'],
  },
  'el-descriptions': { template: '<div class="el-descriptions"><slot /></div>' },
  'el-descriptions-item': {
    template: '<div class="el-descriptions-item"><slot /></div>',
    props: ['label'],
  },
  'el-button': {
    template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
    props: ['type'],
    emits: ['click'],
  },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
  StatusTag: { template: '<span class="status-tag" />', props: ['status'] },
  Iphone: { template: '<span />' },
}

const PUBLIC_ASSET = {
  asset_code: 'A001',
  asset_name: '测试资产',
  asset_specification: '规格X',
  asset_brand: '品牌Y',
  asset_current_status: 'in_use',
  physical_grade: 'A',
}

const mountOptions = {
  global: { stubs },
}

describe('ScanAssetView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pushMock.mockReset()
    fetchPublicScanAssetMock.mockReset()
    mockIsLoggedIn = false
  })

  it('未登录：展示公开 6 字段白名单', async () => {
    fetchPublicScanAssetMock.mockResolvedValue(PUBLIC_ASSET)

    const wrapper = mount(ScanAssetView, mountOptions)
    await flushPromises()

    expect(fetchPublicScanAssetMock).toHaveBeenCalledWith('REC-2024-0001')
    // 6 字段全部渲染
    expect(wrapper.text()).toContain('A001')
    expect(wrapper.text()).toContain('测试资产')
    expect(wrapper.text()).toContain('规格X')
    expect(wrapper.text()).toContain('品牌Y')
    // 不含敏感字段（后端白名单保证，前端不渲染仓库/使用人/入库日期/价格）
    expect(wrapper.text()).not.toContain('存放仓库')
    expect(wrapper.text()).not.toContain('使用人')
    expect(wrapper.text()).not.toContain('入库日期')
  })

  it('未登录：展示「登录查看完整信息」引导按钮，点击跳登录带 redirect', async () => {
    fetchPublicScanAssetMock.mockResolvedValue(PUBLIC_ASSET)

    const wrapper = mount(ScanAssetView, mountOptions)
    await flushPromises()

    const loginBtn = wrapper.findAll('button').find((b) => b.text().includes('登录查看完整信息'))
    expect(loginBtn).toBeTruthy()
    await loginBtn!.trigger('click')
    expect(pushMock).toHaveBeenCalledWith({
      name: 'Login',
      query: { redirect: '/scan/REC-2024-0001' },
    })
  })

  it('已登录：扫码直达 BasicAssetDetails 全量详情（不调公开接口）', async () => {
    mockIsLoggedIn = true

    const wrapper = mount(ScanAssetView, mountOptions)
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({
      name: 'BasicAssetDetails',
      query: { code: 'REC-2024-0001' },
    })
    expect(fetchPublicScanAssetMock).not.toHaveBeenCalled()
    // 直达后本组件不渲染资产内容
    expect(wrapper.find('.el-descriptions').exists()).toBe(false)
  })

  it('加载失败：展示错误分支与重试', async () => {
    fetchPublicScanAssetMock.mockRejectedValue({ isAxiosError: true, response: { status: 500 } })

    const wrapper = mount(ScanAssetView, mountOptions)
    await flushPromises()

    expect(wrapper.text()).toContain('加载失败')
    const retryBtn = wrapper.findAll('button').find((b) => b.text().includes('重试'))
    expect(retryBtn).toBeTruthy()
  })

  it('404：展示「未找到资产」分支', async () => {
    fetchPublicScanAssetMock.mockRejectedValue({ isAxiosError: true, response: { status: 404 } })

    const wrapper = mount(ScanAssetView, mountOptions)
    await flushPromises()

    expect(wrapper.text()).toContain('未找到资产')
  })

  it('业务 code 非 0：unwrapResponse 抛出的 Error 走 ElMessage 提示并进入错误分支', async () => {
    fetchPublicScanAssetMock.mockRejectedValue(new Error('资产不存在'))

    const wrapper = mount(ScanAssetView, mountOptions)
    await flushPromises()

    expect(elMessageError).toHaveBeenCalledWith('资产不存在')
    expect(wrapper.text()).toContain('加载失败')
  })
})
