/**
 * M-RC-13 stale 守卫视图级集成测试
 *
 * 验证三个列表视图收到 store 的 stale undefined 后不清空表格数据：
 * - RoleManage.vue / AuthUserManage.vue / ContactsView.vue 的 `if (res === undefined) return`
 * - store 层 stale→undefined 机理由 createEntityStore.spec.ts 覆盖；
 *   wrapper 直传由 useSmartListConfig.spec.ts 覆盖；本文件锁定视图消费端。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const h = vi.hoisted(() => ({
  roleGetList: vi.fn(),
  authUserGetList: vi.fn(),
  userGetList: vi.fn(),
  userGetFuzzySearch: vi.fn(),
  getDepartmentTree: vi.fn(),
  elMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  elMessageBox: { confirm: vi.fn() },
  debouncedCallbacks: [] as Array<() => void>,
}))

vi.mock('element-plus', () => ({ ElMessage: h.elMessage, ElMessageBox: h.elMessageBox }))

vi.mock('@element-plus/icons-vue', () => {
  const icon = (name: unknown) => ({ name, render: () => null })
  return new Proxy({}, { get: (_t, p) => (typeof p === 'string' ? icon(p) : undefined) })
})

vi.mock('@/composables/usePermission', () => ({
  usePermission: () => ({ isAdmin: false, hasPermission: () => false }),
}))

vi.mock('@/composables/useDebouncedSearch', () => ({
  useDebouncedSearch: (_kw: unknown, cb: () => void) => {
    h.debouncedCallbacks.push(cb)
  },
}))

vi.mock('@/stores/roleStore', () => ({
  useRoleStore: () => ({
    getList: h.roleGetList,
    pagination: { page: 1, page_size: 20, total: 0 },
  }),
}))

vi.mock('@/stores/authUserStore', () => ({
  useAuthUserStore: () => ({
    getList: h.authUserGetList,
    pagination: { page: 1, page_size: 20, total: 0 },
  }),
}))

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    getList: h.userGetList,
    getFuzzySearch: h.userGetFuzzySearch,
    pagination: { page: 1, page_size: 20, total: 0 },
  }),
}))

vi.mock('@/stores/departmentStore', () => ({ getDepartmentTree: h.getDepartmentTree }))

import RoleManage from '@/views/system/RoleManage.vue'
import AuthUserManage from '@/views/system/AuthUserManage.vue'
import ContactsView from '@/views/ContactsView.vue'

function mountView(comp: Parameters<typeof mount>[0]) {
  return mount(comp, {
    shallow: true,
    global: {
      directives: { loading: {} },
      // el-table-column 的作用域插槽（#default="{ row }"）不能被自动 stub 以 undefined 调用
      stubs: { 'el-table-column': { template: '<div />' } },
    },
  })
}

/** 重新触发列表加载（走被 mock 捕获的防抖回调，与翻页/搜索同一入口） */
function refetchLastMounted() {
  h.debouncedCallbacks[h.debouncedCallbacks.length - 1]()
}

describe('M-RC-13 视图级 stale 守卫（undefined 不清表）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.debouncedCallbacks.length = 0
  })

  it('RoleManage：stale 后角色列表保持，不被清空', async () => {
    h.roleGetList.mockResolvedValueOnce([
      { role_code: 'R1', role_name: '管理员', role_level: 1 },
      { role_code: 'R2', role_name: '操作员', role_level: 2 },
    ])
    const wrapper = mountView(RoleManage)
    await flushPromises()
    expect((wrapper.vm as unknown as { roles: unknown[] }).roles).toHaveLength(2)

    h.roleGetList.mockResolvedValueOnce(undefined)
    refetchLastMounted()
    await flushPromises()
    expect((wrapper.vm as unknown as { roles: unknown[] }).roles).toHaveLength(2)

    // 正对照：后续正常响应仍能写回（守卫不误伤）
    h.roleGetList.mockResolvedValueOnce([{ role_code: 'R3', role_name: '审计员', role_level: 3 }])
    refetchLastMounted()
    await flushPromises()
    expect((wrapper.vm as unknown as { roles: unknown[] }).roles).toHaveLength(1)
  })

  it('AuthUserManage：stale 后用户列表保持，不被清空', async () => {
    h.authUserGetList.mockResolvedValueOnce([
      { auth_id: 1, auth_username: 'u1' },
      { auth_id: 2, auth_username: 'u2' },
    ])
    const wrapper = mountView(AuthUserManage)
    await flushPromises()
    expect((wrapper.vm as unknown as { authUsers: unknown[] }).authUsers).toHaveLength(2)

    h.authUserGetList.mockResolvedValueOnce(undefined)
    refetchLastMounted()
    await flushPromises()
    expect((wrapper.vm as unknown as { authUsers: unknown[] }).authUsers).toHaveLength(2)
  })

  it('ContactsView：stale 后通讯录保持，不被清空', async () => {
    h.getDepartmentTree.mockResolvedValue([])
    h.userGetList.mockResolvedValueOnce([
      { employee_jobcode: 'E1', employee_name: '甲' },
      { employee_jobcode: 'E2', employee_name: '乙' },
    ])
    const wrapper = mountView(ContactsView)
    await flushPromises()
    expect((wrapper.vm as unknown as { contacts: unknown[] }).contacts).toHaveLength(2)

    h.userGetList.mockResolvedValueOnce(undefined)
    refetchLastMounted()
    await flushPromises()
    expect((wrapper.vm as unknown as { contacts: unknown[] }).contacts).toHaveLength(2)
  })
})
