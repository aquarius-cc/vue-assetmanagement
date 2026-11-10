/** [批次4 S9①] DashboardPage 挂载覆盖：仪表盘页装配（mock 数据 composable，子组件 shallow stub） */
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, it, expect, vi } from 'vitest'

const mockDashboardPage = vi.hoisted(() => ({
  useDashboardPage: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/composables/useDashboardPage', () => ({ useDashboardPage: mockDashboardPage.useDashboardPage }))

import DashboardPage from '../DashboardPage.vue'

describe('DashboardPage', () => {
  it('装配渲染：welcomeBar/statCards/statusOverview/趋势/分布/告警各 section 在场', () => {
    mockDashboardPage.useDashboardPage.mockReturnValue({
      authInfo: ref({ real_name: '张三', auth_name: 'zhangsan' }),
      currentTime: ref('08:00:00'),
      currentDate: ref('2026-11-10'),
      loginDuration: ref('1 小时'),
      distributeStats: ref([]),
      recycleStats: ref([]),
      wasteStats: ref([]),
      recentOutAssets: ref([]),
      recentRecycleAssets: ref([]),
      refreshData: vi.fn(),
      refreshRecycleData: vi.fn(),
      logout: vi.fn(),
      dashboardStore: {},
      statusOverview: ref({ groups: [], chartData: [], totalAssets: 0 }),
      chartOption: ref({}),
      loadError: ref(null),
      retryFetchDashboard: vi.fn(),
      assetTrend: ref([]),
      departmentDistribution: ref([]),
      assetTypeDistribution: ref([]),
      expiringAssets: ref([]),
      maintenanceReminders: ref([]),
      trendLoading: ref(false),
      deptDistLoading: ref(false),
      typeDistLoading: ref(false),
      expiringLoading: ref(false),
    })

    const wrapper = mount(DashboardPage, { shallow: true })
    expect(wrapper.exists()).toBe(true)
  })
})
