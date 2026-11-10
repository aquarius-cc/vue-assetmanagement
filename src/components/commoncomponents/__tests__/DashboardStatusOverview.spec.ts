/** [批次4 S9①] DashboardStatusOverview 挂载覆盖：状态总览（环形图 + 分组列表） */
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import DashboardStatusOverview from '../DashboardStatusOverview.vue'

describe('DashboardStatusOverview', () => {
  it('空总览渲染不抛错', () => {
    const wrapper = mount(DashboardStatusOverview, {
      props: {
        statusOverview: { groups: [], chartData: [], totalAssets: 0 },
      },
      shallow: true,
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('渲染分组与总数', () => {
    const wrapper = mount(DashboardStatusOverview, {
      props: {
        statusOverview: {
          groups: [
            {
              key: 'in_use',
              label: '在用',
              color: '#52C41A',
              total: 2,
              items: [{ code: 'DEMO-A001', name: '资产A', count: 2, color: '#52C41A' }],
            },
          ],
          chartData: [{ name: '在用', value: 2, itemStyle: { color: '#52C41A' } }],
          totalAssets: 2,
        },
      },
      shallow: true,
    })
    expect(wrapper.html()).toContain('在用')
  })
})
