/**
 * @file RoleManage 挂载测试（M-27 空态/弹性容器 + M-25 组件层挂载覆盖）
 *
 * 背景：RoleManage 表格用 fixed="right" 操作列，原整页滚动（overflow-y:auto）致
 * fixed 列错位；M-27 改表格区弹性自滚容器（.table-container）。本套件锁定三条：
 *  ① 零数据时 el-table 常驻（不被 v-if 摘除）+ 分页隐藏（total=0 → 空态），
 *  ② .table-container 弹性容器在场（fixed 列自滚锚点），
 *  ③ fixed="right" 操作列在场（布局不回归），有数据时分页恢复显示。
 *
 * 环境约束同 AssetLogsView.spec：vitest 独立 plugins:[vue()]，el-* 需显式 stub。
 */
import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getListMock, totalRef } = vi.hoisted(() => ({
  getListMock: vi.fn(),
  totalRef: { total: 0 },
}))

vi.mock('@/stores/roleStore', () => ({
  useRoleStore: () => ({ getList: getListMock, pagination: totalRef }),
}))
vi.mock('@/composables/usePermission', () => ({
  usePermission: () => ({ isAdmin: true }),
}))
vi.mock('@/composables/useDebouncedSearch', () => ({ useDebouncedSearch: vi.fn() }))
vi.mock('@/utils/errorHandler', () => ({ notifyCallerError: vi.fn() }))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}))

import RoleManage from '../RoleManage.vue'

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
  RolePermDialog: { template: '<div />' },
}

function mountPage() {
  return mount(RoleManage, { global: { stubs, directives: { loading: {} } } })
}

beforeEach(() => {
  vi.clearAllMocks()
  totalRef.total = 0
})

describe('RoleManage [M-27/M-25]', () => {
  it('零数据：表格常驻 + 分页隐藏（空态）+ 弹性容器在场', async () => {
    getListMock.mockResolvedValue([])

    const wrapper = mountPage()
    await flushPromises()

    // 弹性自滚容器在场（fixed 列自滚锚点，M-27）
    expect(wrapper.find('.table-container').exists()).toBe(true)
    // 表格常驻（不被 v-if 摘除）
    expect(wrapper.find('.el-table').exists()).toBe(true)
    // 零数据 → total=0 → 分页隐藏（空态，v-if="total>0"）
    expect(wrapper.findComponent({ name: 'ElPagination' }).exists()).toBe(false)
    // getList 已被 onMounted 触发
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
    getListMock.mockResolvedValue([{ id: 1, role_code: 'system_admin', role_name: '管理员' }])
    totalRef.total = 1

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findComponent({ name: 'ElPagination' }).exists()).toBe(true)
  })
})
