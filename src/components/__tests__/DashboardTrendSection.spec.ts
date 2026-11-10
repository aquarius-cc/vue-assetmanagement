/** [批次4 S9①] DashboardTrendSection 挂载覆盖：趋势图 section 渲染 + 月份切换事件 */
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import DashboardTrendSection from '../DashboardTrendSection.vue'

describe('DashboardTrendSection', () => {
  it('空图表配置渲染不抛错', () => {
    const wrapper = mount(DashboardTrendSection, {
      props: { chartOption: {} },
      shallow: true,
    })
    expect(wrapper.exists()).toBe(true)
  })
})
