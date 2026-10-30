/**
 * @file AuthUserManage 挂载测试（M-27 空态/弹性容器 + M-25 组件层挂载覆盖）
 *
 * 背景同 RoleManage.spec：fixed="right" 操作列 + 整页滚动错位 → M-27 改表格区
 * 弹性自滚容器。锁定：① 零数据表格常驻 + 分页隐藏（空态）、② 弹性容器在场、
 * ③ fixed 列在场、④ 有数据分页恢复。
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getListMock, totalRef } = vi.hoisted(() => ({
  getListMock: vi.fn(),
  totalRef: { total: 0 },
}))

vi.mock('@/stores/authUserStore', () => ({
  useAuthUserStore: () => ({ getList: getListMock, pagination: totalRef }),
}))
vi.mock('@/composables/usePermission', () => ({
  usePermission: () => ({ isAdmin: true }),
}))
vi.mock('@/composables/useDebouncedSearch', () => ({ useDebouncedSearch: vi.fn() }))
vi.mock('@/utils/errorHandler', () => ({ notifyCallerError: vi.fn() }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))

import AuthUserManage from '../AuthUserManage.vue'

const stubs = {
  'el-card': { template: '<div class="el-card"><slot name="header" /><slot /></div>' },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
  'el-input': { template: '<input class="el-input" />' },
  'el-button': {
    name: 'ElButton',
    template: '<button class="el-button"><slot /></button>',
    emits: ['click'],
  },
  'el-table': { template: '<div class="el-table"><slot /></div>' },
  'el-table-column': {
    name: 'ElTableColumn',
    props: ['fixed', 'label', 'prop', 'width'],
    // 不渲染默认插槽：行作用域插槽（{ row }）无数据行时为 undefined，真实 el-table
    // 空数据不渲染行插槽，stub 须同行为
    template: '<div class="tcol" :data-fixed="fixed || \'\'">{{ label }}</div>',
  },
  'el-tag': { template: '<span class="el-tag"><slot /></span>' },
  'el-popconfirm': { template: '<div class="el-popconfirm"><slot name="reference" /></div>' },
  'el-pagination': { name: 'ElPagination', template: '<div class="el-pagination" />' },
  'el-dialog': { template: '<div class="el-dialog" v-if="modelValue"><slot /></div>' },
  'el-form': { template: '<form class="el-form"><slot /></form>' },
  'el-form-item': { template: '<div class="el-form-item">{{ label }}<slot /></div>' },
  'el-input-number': { template: '<input class="el-input-number" />' },
  BindAuthUserDialog: { template: '<div />' },
  UserRoleAssignDialog: { template: '<div />' },
}

function mountPage() {
  return mount(AuthUserManage, { global: { stubs, directives: { loading: {} } } })
}

beforeEach(() => {
  vi.clearAllMocks()
  totalRef.total = 0
})

describe('AuthUserManage [M-27/M-25]', () => {
  it('零数据：表格常驻 + 分页隐藏（空态）+ 弹性容器在场', async () => {
    getListMock.mockResolvedValue([])

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('.table-container').exists()).toBe(true)
    expect(wrapper.find('.el-table').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ElPagination' }).exists()).toBe(false)
    expect(getListMock).toHaveBeenCalledTimes(1)
  })

  it('fixed="right" 操作列在场（布局不回归）', async () => {
    getListMock.mockResolvedValue([])

    const wrapper = mountPage()
    await flushPromises()

    const fixedCols = wrapper.findAll('.tcol').filter((c) => c.attributes('data-fixed') === 'right')
    expect(fixedCols.length).toBe(1)
    expect(fixedCols[0].text()).toContain('操作')
  })

  it('有数据（total>0）：分页显示', async () => {
    getListMock.mockResolvedValue([
      { auth_id: 1, auth_username: 'alice', email: 'a@x.com' },
    ])
    totalRef.total = 1

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'ElPagination' }).exists()).toBe(true)
  })
})
