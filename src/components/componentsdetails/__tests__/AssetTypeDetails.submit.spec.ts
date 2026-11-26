/** [D-15] 双击守卫：handleSubmitForm / handleBatchAddSubmit 双击只触发 1 次提交（先红后绿） */
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
const { createMock, updateMock, batchCreateMock } = vi.hoisted(() => ({
  createMock: vi.fn(() => Promise.resolve({})),
  updateMock: vi.fn(() => Promise.resolve({})),
  batchCreateMock: vi.fn(() => Promise.resolve({ success_count: 1, fail_count: 0 })),
}))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve('confirm')) },
}))
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), go: vi.fn() }),
  useRoute: () => ({ path: '/', params: {}, query: {}, matched: [] }),
  onBeforeRouteUpdate: vi.fn(),
  onBeforeRouteLeave: vi.fn(),
}))
vi.mock('@/stores/assetTypeStore', () => ({
  useAssetTypeStore: () => ({
    loading: false,
    assetTypes: { value: [] },
    create: createMock,
    update: updateMock,
    setRefreshFlag: vi.fn(),
  }),
  batchCreateAssetTypes: batchCreateMock,
}))
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
import Component from '../AssetTypeDetails.vue'

describe('AssetTypeDetails 双击守卫（D-15）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountComponent = () =>
    mount(Component, {
      shallow: true,
      global: {
        plugins: [createPinia()],
        stubs: {
          'el-button': { template: '<div />' },
          'el-form': {
            template: '<div><slot /></div>',
            methods: { validate: (cb: (valid: boolean) => void) => cb(true) },
          },
        },
      },
    })

  it('handleSubmitForm 双击：create 仅调用 1 次', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as unknown as { handleSubmitForm: () => Promise<void> }
    // 同 tick 并发触发两次（模拟真实双击），第二次应被 submitting 守卫拦下
    const p1 = vm.handleSubmitForm()
    const p2 = vm.handleSubmitForm()
    await Promise.all([p1, p2])
    await flushPromises()
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('handleBatchAddSubmit 双击：batchCreateAssetTypes 仅调用 1 次', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as unknown as {
      handleBatchAddSubmit: () => Promise<void>
      batchAddList: Array<{ type_code: string; type_name: string; type_description: string }>
    }
    vm.batchAddList.splice(0, vm.batchAddList.length, {
      type_code: 'T1',
      type_name: '分类一',
      type_description: '',
    })
    const p1 = vm.handleBatchAddSubmit()
    const p2 = vm.handleBatchAddSubmit()
    await Promise.all([p1, p2])
    await flushPromises()
    expect(batchCreateMock).toHaveBeenCalledTimes(1)
  })
})
