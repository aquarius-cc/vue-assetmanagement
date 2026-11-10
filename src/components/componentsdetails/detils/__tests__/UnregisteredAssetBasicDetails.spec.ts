/** [批次4 S9] UnregisteredAssetBasicDetails 挂载覆盖（生成式浅挂载；行为断言随迭代加深） */
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, it, expect, vi } from 'vitest'
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
import Component from '../UnregisteredAssetBasicDetails.vue'
describe('UnregisteredAssetBasicDetails 挂载（S9 零覆盖补测）', () => {
  it('浅挂载渲染不抛错', () => {
    const wrapper = mount(Component, {
      shallow: true,
      global: {
        plugins: [createPinia()],
        stubs: {
          'el-button': { template: '<div />' },
          'el-card': { template: '<div />' },
          'el-empty': { template: '<div />' },
          'el-icon': { template: '<div />' },
          'el-tag': { template: '<div />' },
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
