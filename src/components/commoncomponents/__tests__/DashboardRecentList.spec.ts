/** [批次4 S9①] DashboardRecentList 挂载覆盖：最近记录列表（泛型 props + 空态文案） */
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import DashboardRecentList from '../DashboardRecentList.vue'

describe('DashboardRecentList', () => {
  it('空列表渲染空态文案', () => {
    const wrapper = mount(DashboardRecentList, {
      props: {
        title: '最近出库',
        items: [],
        nameKey: 'name',
        operatorKey: 'operator',
        dateKey: 'date',
      },
      shallow: true,
    })
    expect(wrapper.html()).toContain('最近出库')
    expect(wrapper.html()).toContain('暂无记录')
  })

  it('有数据时渲染条目与操作人', () => {
    const wrapper = mount(DashboardRecentList, {
      props: {
        title: '最近出库',
        items: [{ name: 'DEMO-A001', operator: 'U001', date: '2026-11-01 10:00:00' }],
        nameKey: 'name',
        operatorKey: 'operator',
        dateKey: 'date',
      },
      shallow: true,
    })
    expect(wrapper.html()).toContain('DEMO-A001')
  })
})
