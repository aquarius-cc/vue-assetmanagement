/** [批次4 S9] DepartmentManagement 挂载覆盖（生成式浅挂载；行为断言随迭代加深） */
import { mount, flushPromises } from '@vue/test-utils'
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
import Component from '../DepartmentManagement.vue'
describe('DepartmentManagement 挂载（S9 零覆盖补测）', () => {
  it('浅挂载渲染不抛错', () => {
    const wrapper = mount(Component, {
      shallow: true,
      global: {
        plugins: [createPinia()],
        stubs: {
          'el-button': { template: '<div />' },
          'el-empty': { template: '<div />' },
          'el-icon': { template: '<div />' },
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

/**
 * BF-203：拖拽落点后需要持久化 sort_order。
 * 仅同父前后调整时不得再调 moveDepartment（后端 move 对同父为无操作）。
 */
const { moveDepartmentMock, sortDepartmentsMock, getDepartmentTreeMock } = vi.hoisted(() => ({
  moveDepartmentMock: vi.fn(() => Promise.resolve({})),
  sortDepartmentsMock: vi.fn(() => Promise.resolve([])),
  getDepartmentTreeMock: vi.fn(() => Promise.resolve([])),
}))

vi.mock('@/stores/departmentStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/departmentStore')>()
  return {
    ...actual,
    moveDepartment: moveDepartmentMock,
    sortDepartments: sortDepartmentsMock,
    getDepartmentTree: getDepartmentTreeMock,
  }
})

const mountPage = () =>
  mount(Component, {
    global: {
      plugins: [createPinia()],
      stubs: {
        DepartmentTree: { name: 'DepartmentTree', template: '<div />' },
        DepartmentInfoCard: true,
        DepartmentEmployeeList: true,
        DepartmentFormDialog: true,
        DepartmentBatchAddDialog: true,
        'el-button': { template: '<button class="el-btn"><slot /></button>' },
        'el-icon': { template: '<i><slot /></i>' },
        'el-empty': true,
      },
    },
  })

const emitMove = async (payload: Record<string, unknown>) => {
  const wrapper = mountPage()
  const tree = wrapper.findComponent({ name: 'DepartmentTree' })
  tree.vm.$emit('move', payload)
  await flushPromises()
  return { wrapper, tree }
}

const SORT_ITEMS = [
  { department_code: 'D1', sort_order: 0 },
  { department_code: 'D2', sort_order: 1 },
]

describe('DepartmentManagement · 拖拽落点持久化（BF-203）', () => {
  beforeEach(() => {
    moveDepartmentMock.mockClear()
    sortDepartmentsMock.mockClear()
    getDepartmentTreeMock.mockClear()
  })

  it('跨父移动：先 moveDepartment 再 sortDepartments，最后刷新树', async () => {
    await emitMove({
      department_code: 'D2',
      parent_department_code: 'D1',
      parent_changed: true,
      sort_items: SORT_ITEMS,
    })

    expect(moveDepartmentMock).toHaveBeenCalledWith('D2', {
      target_parent_department_code: 'D1',
    })
    expect(sortDepartmentsMock).toHaveBeenCalledWith(SORT_ITEMS)
    expect(getDepartmentTreeMock).toHaveBeenCalled()
    expect(moveDepartmentMock.mock.invocationCallOrder[0]).toBeLessThan(
      sortDepartmentsMock.mock.invocationCallOrder[0],
    )
  })

  it('同一父级内前后调整：不调 moveDepartment，只写 sort_order', async () => {
    await emitMove({
      department_code: 'D2',
      parent_department_code: null,
      parent_changed: false,
      sort_items: SORT_ITEMS,
    })

    expect(moveDepartmentMock).not.toHaveBeenCalled()
    expect(sortDepartmentsMock).toHaveBeenCalledWith(SORT_ITEMS)
    expect(getDepartmentTreeMock).toHaveBeenCalled()
  })

  it('排序项超过 100 条时分批提交', async () => {
    const items = Array.from({ length: 150 }, (_, i) => ({
      department_code: `D${i}`,
      sort_order: i,
    }))

    await emitMove({
      department_code: 'D0',
      parent_department_code: null,
      parent_changed: false,
      sort_items: items,
    })

    expect(sortDepartmentsMock).toHaveBeenCalledTimes(2)
    expect(sortDepartmentsMock.mock.calls[0][0]).toHaveLength(100)
    expect(sortDepartmentsMock.mock.calls[1][0]).toHaveLength(50)
  })
})
