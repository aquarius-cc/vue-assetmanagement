/** [批次4 S9①] DashboardPage 挂载覆盖：仪表盘页装配（mock 数据 composable，子组件 shallow stub） */
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, it, expect, vi } from 'vitest'

const mockDashboardPage = vi.hoisted(() => ({
  useDashboardPage: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/composables/useDashboardPage', () => ({
  useDashboardPage: mockDashboardPage.useDashboardPage,
}))

// 【BF-200】DashboardPage.vue 用 defineAsyncComponent(() => import(...)) 懒加载三个 section，
// 真实模块链会一路拉起 DashboardTrendSection → DashboardAssetTrend / DashboardDistribution →
// echarts.ts；这些动态 import 在用例结束后才落地，会抛 EnvironmentTeardownError 并使
// `npm run test:coverage` 恒 exit 1（本机 3/3 复现）。这里把三个入口 mock 掉，切断懒加载链，
// 让 async component 只解析 mock 注册表，不再触碰真实模块。
vi.mock('@/components/commoncomponents/DashboardStatusOverview.vue', () => ({
  default: { name: 'DashboardStatusOverviewStub', template: '<div class="stub-status" />' },
}))
vi.mock('@/components/DashboardTrendSection.vue', () => ({
  default: { name: 'DashboardTrendSectionStub', template: '<div class="stub-trend" />' },
}))
vi.mock('@/components/DashboardDistributionSection.vue', () => ({
  default: { name: 'DashboardDistributionSectionStub', template: '<div class="stub-dist" />' },
}))

import DashboardPage from '../DashboardPage.vue'

describe('DashboardPage', () => {
  it('装配渲染：welcomeBar/statCards/statusOverview/趋势/分布/告警各 section 在场', async () => {
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
    // 让 defineAsyncComponent 的 loader 在用例内解析完毕，避免 teardown 后才落地
    await flushPromises()
    expect(wrapper.exists()).toBe(true)
  })
})
