/** [批次4 S9①] DashboardAlertsSection 挂载覆盖：双告警源分发出库 */
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import DashboardAlertsSection from '../DashboardAlertsSection.vue'

describe('DashboardAlertsSection', () => {
  it('双告警源空态渲染', () => {
    const wrapper = mount(DashboardAlertsSection, {
      props: { expiringAssets: [], maintenanceReminders: [] },
      shallow: true,
    })
    expect(wrapper.exists()).toBe(true)
  })
})
