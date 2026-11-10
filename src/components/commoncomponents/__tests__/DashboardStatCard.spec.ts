/** [批次4 S9①] DashboardStatCard 挂载覆盖：统计卡片渲染 + refresh 事件 */
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import DashboardStatCard from '../DashboardStatCard.vue'

const stubs = {
  'el-card': { template: '<div class="el-card"><slot name="header" /><slot /></div>' },
  'el-icon': { template: '<span class="el-icon"><slot /></span>' },
  'el-button': { name: 'ElButton', template: '<button class="el-button"><slot /></button>' },
}

describe('DashboardStatCard', () => {
  it('渲染标题与统计项', () => {
    const wrapper = mount(DashboardStatCard, {
      props: {
        title: '资产总数',
        icon: 'DataAnalysis',
        stats: [{ label: '在用', value: 10 }],
        refreshable: true,
      },
      global: { stubs },
    })
    expect(wrapper.html()).toContain('资产总数')
  })

  it('refreshable 时可触发 refresh 事件', async () => {
    const wrapper = mount(DashboardStatCard, {
      props: { title: '资产总数', icon: 'DataAnalysis', refreshable: true },
      global: { stubs },
    })
    wrapper.vm.$emit('refresh')
    expect(wrapper.emitted('refresh')).toBeTruthy()
  })
})
