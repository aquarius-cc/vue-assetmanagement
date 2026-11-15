/** [批次4 C1/M-11] batchAddList 稳定行 id——增删行重排 bug 的行为锚（先红后绿） */
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
import Component from '../AssetTypeDetails.vue'

// [C1 生成式补测] 中和传递性 API 调用（组件→store 链），禁真实请求（T12）
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

describe('AssetTypeDetails 批量新增行稳定 id（M-11）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mountComponent = () =>
    mount(Component, {
      shallow: true,
      global: { plugins: [createPinia()], stubs: { 'el-button': { template: '<div />' } } },
    })

  it('addBatchItem ×3：每行携带唯一稳定 id', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as unknown as {
      addBatchItem: () => void
      batchAddList: Array<{ type_code: string; _rowId: number }>
    }
    vm.addBatchItem()
    vm.addBatchItem()
    vm.addBatchItem()
    expect(vm.batchAddList).toHaveLength(3)
    const ids = vm.batchAddList.map((r) => r._rowId)
    expect(new Set(ids).size).toBe(3)
    ids.forEach((id) => expect(Number.isFinite(id)).toBe(true))
  })

  it('删除中间行：存活行 id 不变（index key 重排 bug 行为锚）', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as unknown as {
      addBatchItem: () => void
      batchAddList: Array<{ type_code: string; _rowId: number }>
    }
    vm.addBatchItem()
    vm.addBatchItem()
    vm.addBatchItem()
    const before = vm.batchAddList.map((r) => r._rowId)
    expect(new Set(before).size).toBe(3)
    vm.batchAddList.splice(1, 1)
    expect(vm.batchAddList.map((r) => r._rowId)).toEqual([before[0], before[2]])
  })

  it('删除后新增：新行 id 不复用已删行 id', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as unknown as {
      addBatchItem: () => void
      batchAddList: Array<{ type_code: string; _rowId: number }>
    }
    vm.addBatchItem()
    const removed = vm.batchAddList[0]._rowId
    vm.batchAddList.splice(0, 1)
    vm.addBatchItem()
    expect(vm.batchAddList).toHaveLength(1)
    expect(vm.batchAddList[0]._rowId).not.toBe(removed)
  })

  it('handleBatchAddChildType 重置路径：初始行同样携带 id', async () => {
    const wrapper = mountComponent()
    const vm = wrapper.vm as unknown as {
      selectedType: unknown
      handleBatchAddChildType: () => void
      batchAddList: Array<{ type_code: string; _rowId: number }>
    }
    vm.selectedType = { type_name: 'n', type_code: 'c' }
    vm.handleBatchAddChildType()
    expect(vm.batchAddList).toHaveLength(1)
    expect(Number.isFinite(vm.batchAddList[0]._rowId)).toBe(true)
  })
})
