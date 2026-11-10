/** [批次4 S9①] DashboardAlertList 挂载覆盖：告警列表渲染 + 空态 */
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import DashboardAlertList from '../DashboardAlertList.vue'

// 显式 stub（RoleManage 同款）：el-table-column stub 不渲染默认插槽——
// 真实 el-table 空数据不渲染行作用域插槽，stub 须同行为，否则 #default="{ row }"
// 在 undefined 上解构抛错
const stubs = {
  'el-table': { template: '<div class="el-table"><slot /></div>' },
  'el-table-column': {
    name: 'ElTableColumn',
    props: ['prop', 'label', 'width', 'minWidth', 'align'],
    template: '<div class="tcol">{{ label }}</div>',
  },
  'el-empty': { template: '<div class="el-empty" />' },
  'el-tag': { template: '<span class="el-tag"><slot /></span>' },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
}

describe('DashboardAlertList', () => {
  it('空列表渲染不抛错', () => {
    const wrapper = mount(DashboardAlertList, {
      props: { items: [], labelField: 'name' },
      global: { stubs },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('有数据时列桩渲染（行内容由真实 el-table 行插槽消费，stub 不渲染）', () => {
    const wrapper = mount(DashboardAlertList, {
      props: { items: [{ name: '资产A', count: 1, level: 'warning' }], labelField: 'name' },
      global: { stubs },
    })
    expect(wrapper.findAll('.tcol').length).toBeGreaterThan(0)
  })
})
