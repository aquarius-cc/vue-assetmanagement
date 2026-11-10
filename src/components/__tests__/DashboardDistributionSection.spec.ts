/** [批次4 S9①] DashboardDistributionSection 挂载覆盖：分布图 section 渲染 */
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import DashboardDistributionSection from '../DashboardDistributionSection.vue'

describe('DashboardDistributionSection', () => {
  it('空图表配置渲染不抛错', () => {
    const wrapper = mount(DashboardDistributionSection, {
      props: { deptPieOption: {}, typePieOption: {} },
      shallow: true,
    })
    expect(wrapper.exists()).toBe(true)
  })
})
