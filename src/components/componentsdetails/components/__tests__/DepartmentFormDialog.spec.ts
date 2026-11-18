/** [批次4 S9] DepartmentFormDialog 挂载覆盖（生成式浅挂载；行为断言随迭代加深） */
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, it, expect, vi } from 'vitest'
import type { Department, DepartmentTreeNode } from '@/types/department'
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
  ElMessageBox: { confirm: vi.fn(() => Promise.resolve('confirm')) },
}))
import Component from '../DepartmentFormDialog.vue'
describe('DepartmentFormDialog 挂载（S9 零覆盖补测）', () => {
  it('浅挂载渲染不抛错', () => {
    const wrapper = mount(Component, {
      shallow: true,
      global: {
        plugins: [createPinia()],
        stubs: {
          'el-button': { template: '<div />' },
          'el-dialog': { template: '<div />' },
          'el-form': { template: '<div />' },
          'el-form-item': { template: '<div />' },
          'el-input': { template: '<div />' },
          'el-input-number': { template: '<div />' },
          'el-tree-select': { template: '<div />' },
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
 * BF-202：编辑模式下「自己 + 全部子孙」必须禁用为上级部门。
 * 旧实现按 parent 链判定只命中直系子，孙及更深仍可选 → 可选成环（后端 400 兜底）。
 */
const mkDept = (
  code: string,
  level: number,
  parent: string | null,
  children?: DepartmentTreeNode[],
) =>
  ({
    recordcode: `rc-${code}`,
    department_code: code,
    department_name: code,
    department_information: '',
    parent,
    parent_department_code: parent,
    path: code,
    level,
    sort_order: 0,
    children,
  }) as unknown as DepartmentTreeNode

const L2 = mkDept('L2', 2, 'L1')
const L1 = mkDept('L1', 1, 'L0', [L2])
const S1 = mkDept('S1', 0, null)
const L0 = mkDept('L0', 0, null, [L1])
const TREE = [L0, S1]

const TreeSelectStub = { name: 'ElTreeSelect', props: ['data'], template: '<div />' }
const FormStub = { name: 'ElForm', props: ['model', 'rules'], template: '<form><slot /></form>' }

const mountEdit = () =>
  mount(Component, {
    props: {
      visible: true,
      type: 'edit',
      editDepartment: L0 as unknown as Department,
      departmentTree: TREE,
    },
    global: {
      plugins: [createPinia()],
      stubs: {
        'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
        'el-form': FormStub,
        'el-form-item': { template: '<div><slot /></div>' },
        'el-input': { template: '<div />' },
        'el-input-number': { template: '<div />' },
        'el-tree-select': TreeSelectStub,
        'el-button': { template: '<button><slot /></button>' },
      },
    },
  })

const flatten = (nodes: DepartmentTreeNode[]): DepartmentTreeNode[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children ?? [])])

type ParentRule = {
  validator: (rule: unknown, value: string | null, callback: (error?: Error) => void) => void
}

describe('DepartmentFormDialog · 编辑模式上级部门禁用（BF-202）', () => {
  it('自己、子、孙三级均 disabled，兄弟部门保持可选', () => {
    const wrapper = mountEdit()
    const nodes = wrapper
      .findComponent({ name: 'ElTreeSelect' })
      .props('data') as DepartmentTreeNode[]
    const byCode = (code: string) =>
      flatten(nodes).find((node) => node.department_code === code) as DepartmentTreeNode & {
        disabled?: boolean
      }

    expect(byCode('L0').disabled).toBe(true)
    expect(byCode('L1').disabled).toBe(true)
    expect(byCode('L2').disabled).toBe(true)
    expect(byCode('S1').disabled).toBeUndefined()
  })

  it('校验器拒绝孙级作为上级部门，放行兄弟部门', () => {
    const wrapper = mountEdit()
    const rules = wrapper.findComponent({ name: 'ElForm' }).props('rules') as Record<
      string,
      ParentRule[]
    >
    const validator = rules.parent_department_code[0].validator

    const reject = vi.fn()
    validator(null, 'L2', reject)
    expect(reject).toHaveBeenCalledTimes(1)
    expect((reject.mock.calls[0][0] as Error).message).toContain('子部门')

    const accept = vi.fn()
    validator(null, 'S1', accept)
    expect(accept).toHaveBeenCalledWith()
  })
})
