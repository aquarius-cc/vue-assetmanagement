/**
 * @file dashboard Store 边界/防御性分支测试
 * @module stores/__tests__/dashboard.edge
 * @description 覆盖 statusOverview 的缺省回退（缺名称/缺计数/缺颜色映射）、
 *   以及 8 个 fetch 方法在非 AxiosError 且无 message 时的默认错误文案。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDashboardStore } from '../dashboard'

vi.mock('@/api/dashboard', () => ({
  dashboardAPI: {
    getDashboardOverview: vi.fn(),
    getRecentOutAssets: vi.fn(),
    getRecentRecycleAssets: vi.fn(),
    getAssetTrend: vi.fn(),
    getDepartmentDistribution: vi.fn(),
    getAssetTypeDistribution: vi.fn(),
    getExpiringAssets: vi.fn(),
    getMaintenanceReminders: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

// 颜色映射留空，强制命中「未登记状态码 → #909399 / 原状态码」回退分支
vi.mock('@/utils/statusMapping', () => ({
  getStatusColor: vi.fn(() => '#909399'),
  ASSET_STATUS_CHART_COLORS: {},
}))

describe('DashboardStore 边界分支', () => {
  let store: ReturnType<typeof useDashboardStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDashboardStore()
    vi.clearAllMocks()
  })

  it('statusOverview 在缺名称/缺计数/缺颜色映射时回退', () => {
    expect(store.statusOverview.totalAssets).toBe(0)

    store.overview = {
      total_assets: 5,
      status_distribution: { in_use: { count: 5 } },
    } as never

    const overview = store.statusOverview
    const inUse = overview.groups.flatMap((g) => g.items).find((i) => i.code === 'in_use')

    expect(inUse?.name).toBe('in_use')
    expect(inUse?.color).toBe('#909399')
    expect(overview.chartData).toEqual([
      { name: 'in_use', value: 5, itemStyle: { color: '#909399' } },
    ])
  })

  it('非 AxiosError 且无 message 时使用默认错误文案', async () => {
    const { dashboardAPI } = await import('@/api/dashboard')
    const { ElMessage } = await import('element-plus')

    const cases = [
      {
        api: dashboardAPI.getDashboardOverview,
        run: () => store.fetchDashboardOverview(true),
        msg: '获取仪表盘概览数据失败',
      },
      {
        api: dashboardAPI.getRecentOutAssets,
        run: () => store.fetchRecentOutAssets(),
        msg: '获取最近发放记录失败',
      },
      {
        api: dashboardAPI.getRecentRecycleAssets,
        run: () => store.fetchRecentRecycleAssets(),
        msg: '获取最近回收记录失败',
      },
      {
        api: dashboardAPI.getAssetTrend,
        run: () => store.fetchAssetTrend(),
        msg: '获取资产趋势数据失败',
      },
      {
        api: dashboardAPI.getDepartmentDistribution,
        run: () => store.fetchDepartmentDistribution(),
        msg: '获取部门分布数据失败',
      },
      {
        api: dashboardAPI.getAssetTypeDistribution,
        run: () => store.fetchAssetTypeDistribution(),
        msg: '获取类型分布数据失败',
      },
      {
        api: dashboardAPI.getExpiringAssets,
        run: () => store.fetchExpiringAssets(),
        msg: '获取即将到期资产失败',
      },
      {
        api: dashboardAPI.getMaintenanceReminders,
        run: () => store.fetchMaintenanceReminders(),
        msg: '获取维护提醒失败',
      },
    ]

    for (const c of cases) {
      vi.mocked(c.api).mockRejectedValue(new Error(''))
      await expect(c.run()).rejects.toThrow()
      expect(ElMessage.error).toHaveBeenCalledWith(c.msg)
    }
  })

  it('AxiosError 时交由拦截器提示，不重复弹窗', async () => {
    const { dashboardAPI } = await import('@/api/dashboard')
    const { ElMessage } = await import('element-plus')
    const axiosError = Object.assign(new Error('网络错误'), { isAxiosError: true })

    const runs = [
      { api: dashboardAPI.getDashboardOverview, run: () => store.fetchDashboardOverview(true) },
      { api: dashboardAPI.getRecentOutAssets, run: () => store.fetchRecentOutAssets() },
      { api: dashboardAPI.getRecentRecycleAssets, run: () => store.fetchRecentRecycleAssets() },
      { api: dashboardAPI.getAssetTrend, run: () => store.fetchAssetTrend() },
      {
        api: dashboardAPI.getDepartmentDistribution,
        run: () => store.fetchDepartmentDistribution(),
      },
      { api: dashboardAPI.getAssetTypeDistribution, run: () => store.fetchAssetTypeDistribution() },
      { api: dashboardAPI.getExpiringAssets, run: () => store.fetchExpiringAssets() },
      { api: dashboardAPI.getMaintenanceReminders, run: () => store.fetchMaintenanceReminders() },
    ]

    for (const r of runs) {
      vi.mocked(r.api).mockRejectedValue(axiosError)
      await expect(r.run()).rejects.toThrow('网络错误')
    }

    expect(ElMessage.error).not.toHaveBeenCalled()
  })
})
