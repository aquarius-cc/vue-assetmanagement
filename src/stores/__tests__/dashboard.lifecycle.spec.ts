/**
 * @file dashboard Store 请求生命周期测试（加载中间态 / 概览节流缓存 / 趋势竞态 / 清缓存）
 * @module stores/__tests__/dashboard.lifecycle
 * @description 变异测试（T16）补杀专项：loading 置位中间态、5 分钟节流的边界与 force 语义、
 *   trend 双请求竞态的过期响应/错误/finally 丢弃，以及 clearCache 全量复位。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

function createDeferred() {
  let resolve!: (v: never) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<never>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('DashboardStore 请求生命周期', () => {
  let store: ReturnType<typeof useDashboardStore>

  beforeEach(() => {
    vi.resetAllMocks()
    setActivePinia(createPinia())
    store = useDashboardStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('加载中间态', () => {
    it('各 fetch 在请求挂起期间将对应 loading 置为 true', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const pending = () => new Promise<never>(() => {})

      const cases = [
        {
          api: dashboardAPI.getDashboardOverview,
          run: () => store.fetchDashboardOverview(true),
          flag: () => store.overviewLoading,
        },
        {
          api: dashboardAPI.getRecentOutAssets,
          run: () => store.fetchRecentOutAssets(),
          flag: () => store.outAssetsLoading,
        },
        {
          api: dashboardAPI.getRecentRecycleAssets,
          run: () => store.fetchRecentRecycleAssets(),
          flag: () => store.recycleAssetsLoading,
        },
        {
          api: dashboardAPI.getAssetTrend,
          run: () => store.fetchAssetTrend(),
          flag: () => store.trendLoading,
        },
        {
          api: dashboardAPI.getDepartmentDistribution,
          run: () => store.fetchDepartmentDistribution(),
          flag: () => store.deptDistLoading,
        },
        {
          api: dashboardAPI.getAssetTypeDistribution,
          run: () => store.fetchAssetTypeDistribution(),
          flag: () => store.typeDistLoading,
        },
        {
          api: dashboardAPI.getExpiringAssets,
          run: () => store.fetchExpiringAssets(),
          flag: () => store.expiringLoading,
        },
        {
          api: dashboardAPI.getMaintenanceReminders,
          run: () => store.fetchMaintenanceReminders(),
          flag: () => store.maintenanceLoading,
        },
      ]

      for (const c of cases) {
        vi.mocked(c.api).mockReturnValue(pending())
        void c.run()
        expect(c.flag()).toBe(true)
      }
    })
  })

  describe('概览节流缓存', () => {
    it('5 分钟窗口内命中缓存不重复请求，过期后重新请求', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const overview = { total_assets: 1 } as never
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue(overview)

      await store.fetchDashboardOverview()
      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalledTimes(1)

      store.overviewLastUpdateTime = new Date(Date.now() - 10 * 1000)
      const cached = await store.fetchDashboardOverview()
      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalledTimes(1)
      expect(cached).toEqual(overview)

      store.overviewLastUpdateTime = new Date(Date.now() - 5 * 60 * 1000 - 1000)
      await store.fetchDashboardOverview()
      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalledTimes(2)
    })

    it('时间差恰为 5 分钟时按严格小于判定，仍发起请求', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({} as never)

      await store.fetchDashboardOverview()
      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalledTimes(1)

      vi.useFakeTimers()
      const now = new Date('2026-06-01T00:00:00.000Z')
      vi.setSystemTime(now)
      store.overviewLastUpdateTime = new Date(now.getTime() - 5 * 60 * 1000)
      await store.fetchDashboardOverview()
      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalledTimes(2)
    })

    it('refreshStats 以 force 绕过节流缓存强制刷新概览', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({} as never)

      await store.fetchDashboardOverview()
      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalledTimes(1)

      await store.refreshStats()
      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalledTimes(2)
    })
  })

  describe('趋势请求竞态', () => {
    it('过期响应先到不落库，过期 finally 不提前清除 loading', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const d1 = createDeferred()
      const d2 = createDeferred()
      vi.mocked(dashboardAPI.getAssetTrend)
        .mockReturnValueOnce(d1.promise)
        .mockReturnValueOnce(d2.promise)

      const p1 = store.fetchAssetTrend()
      const p2 = store.fetchAssetTrend()
      expect(store.trendLoading).toBe(true)

      d1.resolve([{ date: '2026-01-01', count: 1 }] as never)
      await p1
      expect(store.assetTrend).toEqual([])
      expect(store.trendLoading).toBe(true)

      const latestData = [{ date: '2026-01-02', count: 2 }] as never
      d2.resolve(latestData)
      await p2
      expect(store.assetTrend).toEqual(latestData)
      expect(store.trendLoading).toBe(false)
    })

    it('过期请求的错误静默丢弃，仅最新请求错误记录日志', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const { logError } = await import('@/utils/logger')
      const d1 = createDeferred()
      const d2 = createDeferred()
      vi.mocked(dashboardAPI.getAssetTrend)
        .mockReturnValueOnce(d1.promise)
        .mockReturnValueOnce(d2.promise)

      const p1 = store.fetchAssetTrend()
      const p2 = store.fetchAssetTrend()

      d1.reject(new Error('stale'))
      await expect(p1).rejects.toThrow('stale')
      expect(logError).not.toHaveBeenCalled()
      expect(store.trendLoading).toBe(true)

      d2.reject(new Error('latest'))
      await expect(p2).rejects.toThrow('latest')
      expect(logError).toHaveBeenCalledWith(
        'stores/dashboard',
        '获取资产趋势数据失败',
        expect.any(Error),
      )
      expect(store.trendLoading).toBe(false)
    })
  })

  describe('clearCache', () => {
    it('将各数据列表与概览时间戳全量复位', () => {
      store.overview = { total_assets: 9 } as never
      store.recentOutAssets = [{ asset_name: 'A' }] as never
      store.recentRecycleAssets = [{ asset_name: 'B' }] as never
      store.assetTrend = [{ date: '2026-01-01', count: 1 }] as never
      store.departmentDistribution = [{ name: '研发', count: 1 }] as never
      store.assetTypeDistribution = [{ name: '电脑', count: 1 }] as never
      store.expiringAssets = [{ asset_name: 'C' }] as never
      store.maintenanceReminders = [{ asset_name: 'D' }] as never
      store.overviewLastUpdateTime = new Date()

      store.clearCache()

      expect(store.overview).toBeNull()
      expect(store.recentOutAssets).toEqual([])
      expect(store.recentRecycleAssets).toEqual([])
      expect(store.assetTrend).toEqual([])
      expect(store.departmentDistribution).toEqual([])
      expect(store.assetTypeDistribution).toEqual([])
      expect(store.expiringAssets).toEqual([])
      expect(store.maintenanceReminders).toEqual([])
      expect(store.overviewLastUpdateTime).toBeNull()
    })
  })
})
