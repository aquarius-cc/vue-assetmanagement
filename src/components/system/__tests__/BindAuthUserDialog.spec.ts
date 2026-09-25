import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BindAuthUserDialog from '../BindAuthUserDialog.vue'

const { mockStore } = vi.hoisted(() => ({
  mockStore: {
    searchEmployees: vi.fn(),
    getBoundEmployee: vi.fn(),
    bindAuthUser: vi.fn(),
    unbindAuthUser: vi.fn(),
    replaceAuthUser: vi.fn(),
  },
}))

vi.mock('@/stores/authUserStore', () => ({
  useAuthUserStore: () => mockStore,
}))

vi.mock('@/composables/useDebouncedSearch', () => ({
  useDebouncedSearch: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn() },
  ElMessageBox: { confirm: vi.fn() },
}))

const stubs = {
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>', props: ['modelValue'] },
  'el-descriptions': { template: '<div><slot /></div>' },
  'el-descriptions-item': { template: '<div><slot /></div>', props: ['label'] },
  'el-button': { template: '<button><slot /></button>' },
  'el-input': { template: '<input />', props: ['modelValue'] },
  'v-loading': { template: '<div><slot /></div>' },
  StatusTag: { template: '<span />' },
}

const mountDialog = async (authUser: { id: number; username: string } | null) => {
  const wrapper = mount(BindAuthUserDialog, {
    props: { visible: false, mode: 'from-authuser', authUser },
    global: { stubs },
  })
  await wrapper.setProps({ visible: true })
  await flushPromises()
  return wrapper
}

describe('BindAuthUserDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.getBoundEmployee.mockResolvedValue({
      employee_jobcode: 'EMP001',
      employee_name: '张三',
      employee_status: 'active',
      auth_user: 1,
    })
  })

  it('已绑定时显示真实绑定用户名（来自 authUser props，非后端不存在的 auth_user_username）', async () => {
    const wrapper = await mountDialog({ id: 1, username: 'admin' })

    expect(mockStore.getBoundEmployee).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('admin')
  })

  it('authUser 为 null 时不查询绑定员工且不渲染 undefined', async () => {
    const wrapper = await mountDialog(null)

    expect(mockStore.getBoundEmployee).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('undefined')
  })
})
