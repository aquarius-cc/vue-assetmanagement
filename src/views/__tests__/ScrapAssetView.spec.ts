/** [批次4 S9] ScrapAssetView 挂载覆盖（生成式浅挂载；行为断言随迭代加深） */
/** [M-FE-03 / CT-4] 追加报废按钮 8 状态行为断言，验证 disabled 由 canScrap 单源驱动 */
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, it, expect, vi } from 'vitest'

const mockAssetState = vi.hoisted(() => ({ status: 'broken' as string }))

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve('confirm')) },
}))
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ path: '/', params: { code: 'A001' }, query: {}, matched: [] }),
  onBeforeRouteUpdate: vi.fn(),
  onBeforeRouteLeave: vi.fn(),
}))
vi.mock('@/composables/useOperationGuard', () => ({
  useOperationGuard: () => ({
    guardOnMounted: () => true,
    handleForbiddenError: () => false,
    handleConflictError: () => false,
  }),
}))
vi.mock('@/api/asset', () => ({
  assetAPI: {
    getAssetByCode: vi.fn(() =>
      Promise.resolve({
        asset_code: 'A001',
        asset_current_status: mockAssetState.status,
      }),
    ),
  },
}))
import Component from '../ScrapAssetView.vue'
describe('ScrapAssetView 挂载（S9 零覆盖补测）', () => {
  it('浅挂载渲染不抛错', () => {
    const wrapper = mount(Component, {
      shallow: true,
      global: {
        plugins: [createPinia()],
        stubs: {
          'el-button': { template: '<div />' },
          'el-form': { template: '<div />' },
          'el-form-item': { template: '<div />' },
          'el-input': { template: '<div />' },
        },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })
})

// [S9 生成式补测] 中和传递性 API 调用（组件→composable→store 链），禁真实请求（T12）
vi.mock('@/api/request', () => ({
  get: vi.fn(() => Promise.resolve({ code: 200, data: { count: 0, results: [] }, message: 'ok' })),
  post: vi.fn(() => Promise.resolve({ code: 200, data: {}, message: 'ok' })),
  put: vi.fn(() => Promise.resolve({ code: 200, data: {}, message: 'ok' })),
  patch: vi.fn(() => Promise.resolve({ code: 200, data: {}, message: 'ok' })),
  delete: vi.fn(() => Promise.resolve({ code: 200, data: {}, message: 'ok' })),
  buildLoginRedirectUrl: vi.fn(() => '/login'),
  clearCacheByPattern: vi.fn(),
  degradedCacheKeys: new Set(),
}))

// [S9 生成式补测] 经 @/api/index 的真实调用链一并中和（含 *API 命名导出与 request 对象）
vi.mock('@/api/index', () => {
  const payload = { count: 0, results: [] as unknown[], page: 1, page_size: 20, total_pages: 0 }
  const mk = () => vi.fn(() => Promise.resolve(payload))
  const apiStub = () => new Proxy({}, { get: () => mk() })
  return {
    request: apiStub(),
    unwrapResponse: vi.fn((res: { data?: unknown } | undefined) => res?.data ?? res),
    getBlob: mk(),
    clearCacheByPattern: vi.fn(),
    degradedCacheKeys: new Set(),
    buildLoginRedirectUrl: vi.fn(() => '/login'),
    authAPI: apiStub(),
    userAPI: apiStub(),
    departmentAPI: apiStub(),
    assetAPI: apiStub(),
    dashboardAPI: apiStub(),
    contractAPI: apiStub(),
    storageAPI: apiStub(),
    assetTypeAPI: apiStub(),
    outAssetAPI: apiStub(),
    recycleAssetAPI: apiStub(),
    damagedAssetAPI: apiStub(),
    wasteAssetAPI: apiStub(),
    networkAPI: apiStub(),
    unregisteredAssetAPI: apiStub(),
    operationLogAPI: apiStub(),
    harddiskSnAPI: apiStub(),
  }
})

// [M-FE-03 / CT-4] 8 状态行为用例：按钮 disabled 必须完全由 canScrap 单源驱动
describe('ScrapAssetView 报废按钮 disabled（canScrap 单源契约）', () => {
  const allowed = ['broken', 'lost', 'recycled_pending']
  const allStatuses = [
    'in_store',
    'in_use',
    'recycled_pending',
    'broken',
    'repairing',
    'lost',
    'damaged',
    'scrapped',
  ]

  for (const status of allStatuses) {
    it(`状态 ${status} → disabled=${!allowed.includes(status)}`, async () => {
      mockAssetState.status = status
      const wrapper = mount(Component, {
        global: {
          plugins: [createPinia()],
          stubs: {
            AssetOperationLayout: {
              template: '<div><slot name="form" /><slot name="actions" /></div>',
            },
            'el-button': {
              props: ['disabled', 'loading', 'type'],
              template: '<button :disabled="disabled"><slot /></button>',
            },
            'el-form': { template: '<form><slot /></form>' },
            'el-form-item': { template: '<div><slot /></div>' },
            'el-input': { template: '<input />' },
          },
        },
      })
      await flushPromises()
      const submitButton = wrapper.findAll('button').find((b) => b.text().includes('提交报废申请'))
      expect(submitButton).toBeDefined()
      const disabled = submitButton!.attributes('disabled') !== undefined
      expect(disabled).toBe(!allowed.includes(status))
    })
  }
})
