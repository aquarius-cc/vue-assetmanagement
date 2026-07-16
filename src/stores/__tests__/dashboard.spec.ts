import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDashboardStore } from '../dashboard'

vi.mock('@/api/dashboard', () => ({
  dashboardAPI: {
    getDashboardOverview: vi.fn(),
    getRecentOutAssets: vi.fn(),
    getRecentRecycleAssets: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@/utils/statusMapping', () => ({
  getStatusColor: vi.fn((status: string) => {
    const map: Record<string, string> = {
      in_store: '#52C41A',
      in_use: '#409EFF',
      damaged: '#E6A23C',
    }
    return map[status] || '#909399'
  }),
}))

describe('DashboardStore', () => {
  let store: ReturnType<typeof useDashboardStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useDashboardStore()
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应该初始化为空', () => {
      expect(store.overview).toBeNull()
      expect(store.recentOutAssets).toEqual([])
      expect(store.recentRecycleAssets).toEqual([])
      expect(store.overviewLoading).toBe(false)
      expect(store.overviewLastUpdateTime).toBeNull()
    })

    it('计算属性在无数据时返回默认值', () => {
      expect(store.distributeStats.monthlyDistributed).toBe(0)
      expect(store.distributeStats.totalAssets).toBe(0)
      expect(store.recycleStats.monthlyRecycled).toBe(0)
      expect(store.wasteStats.pendingWaste).toBe(0)
    })
  })

  describe('fetchDashboardOverview', () => {
    const mockOverview = {
      total_assets: 100,
      active_assets: 80,
      in_stock_assets: 20,
      monthly_distributed: 10,
      monthly_recycled: 5,
      pending_waste: 3,
      wasted_assets: 2,
      total_recycled: 50,
      total_distributed: 60,
      timestamp: '2026-01-01T00:00:00Z',
    }

    it('应该获取概览数据并更新状态', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue(mockOverview)

      const result = await store.fetchDashboardOverview()

      expect(result).toEqual(mockOverview)
      expect(store.overview).toEqual(mockOverview)
      expect(store.overviewLoading).toBe(false)
      expect(store.overviewLastUpdateTime).toBeInstanceOf(Date)
    })

    it('应该在缓存有效时返回缓存数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue(mockOverview)

      await store.fetchDashboardOverview()
      vi.mocked(dashboardAPI.getDashboardOverview).mockClear()

      const cachedResult = await store.fetchDashboardOverview()

      expect(cachedResult).toEqual(mockOverview)
      expect(dashboardAPI.getDashboardOverview).not.toHaveBeenCalled()
    })

    it('forceRefresh=true 时应跳过缓存', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue(mockOverview)

      await store.fetchDashboardOverview()
      vi.mocked(dashboardAPI.getDashboardOverview).mockClear()

      await store.fetchDashboardOverview(true)

      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalled()
    })

    it('API 失败时应显示错误消息并抛出异常', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const { ElMessage } = await import('element-plus')
      vi.mocked(dashboardAPI.getDashboardOverview).mockRejectedValue(new Error('网络错误'))

      await expect(store.fetchDashboardOverview()).rejects.toThrow('网络错误')
      expect(ElMessage.error).toHaveBeenCalledWith('获取仪表盘概览数据失败')
      expect(store.overviewLoading).toBe(false)
    })
  })

  describe('refreshStats', () => {
    it('应该同时刷新所有数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({
        total_assets: 50,
        active_assets: 40,
        in_stock_assets: 10,
        monthly_distributed: 5,
        monthly_recycled: 2,
        pending_waste: 1,
        wasted_assets: 0,
        total_recycled: 20,
        total_distributed: 30,
        timestamp: '2026-01-01T00:00:00Z',
      })
      vi.mocked(dashboardAPI.getRecentOutAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getRecentRecycleAssets).mockResolvedValue([])

      await store.refreshStats()

      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalled()
      expect(dashboardAPI.getRecentOutAssets).toHaveBeenCalled()
      expect(dashboardAPI.getRecentRecycleAssets).toHaveBeenCalled()
    })
  })

  describe('clearCache', () => {
    it('应该清除所有缓存数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({
        total_assets: 100,
        active_assets: 80,
        in_stock_assets: 20,
        monthly_distributed: 10,
        monthly_recycled: 5,
        pending_waste: 3,
        wasted_assets: 2,
        total_recycled: 50,
        total_distributed: 60,
        timestamp: '2026-01-01T00:00:00Z',
      })
      vi.mocked(dashboardAPI.getRecentOutAssets).mockResolvedValue([
        {
          id: 1,
          asset_name: '电脑',
          asset_code: 'A001',
          distribute_time: '',
          recipient_name: '',
          department_name: '',
        },
      ])
      vi.mocked(dashboardAPI.getRecentRecycleAssets).mockResolvedValue([])

      await store.fetchDashboardOverview()
      await store.fetchRecentOutAssets()

      store.clearCache()

      expect(store.overview).toBeNull()
      expect(store.recentOutAssets).toEqual([])
      expect(store.recentRecycleAssets).toEqual([])
      expect(store.overviewLastUpdateTime).toBeNull()
    })
  })

  describe('getStatusColor', () => {
    it('应该返回正确的状态颜色', () => {
      expect(store.getStatusColor('in_store')).toBe('#52C41A')
      expect(store.getStatusColor('in_use')).toBe('#409EFF')
      expect(store.getStatusColor('damaged')).toBe('#E6A23C')
      expect(store.getStatusColor('unknown')).toBe('#909399')
    })
  })

  describe('计算属性', () => {
    it('distributeStats 应该反映 overview 数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({
        total_assets: 100,
        active_assets: 80,
        in_stock_assets: 20,
        monthly_distributed: 10,
        monthly_recycled: 5,
        pending_waste: 3,
        wasted_assets: 2,
        total_recycled: 50,
        total_distributed: 60,
        timestamp: '2026-01-01T00:00:00Z',
      })

      await store.fetchDashboardOverview()

      expect(store.distributeStats.monthlyDistributed).toBe(10)
      expect(store.distributeStats.totalDistributed).toBe(60)
      expect(store.distributeStats.totalAssets).toBe(100)
    })

    it('recycleStats 应该反映 overview 数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({
        total_assets: 100,
        active_assets: 80,
        in_stock_assets: 20,
        monthly_distributed: 10,
        monthly_recycled: 5,
        pending_waste: 3,
        wasted_assets: 2,
        total_recycled: 50,
        total_distributed: 60,
        timestamp: '2026-01-01T00:00:00Z',
      })

      await store.fetchDashboardOverview()

      expect(store.recycleStats.monthlyRecycled).toBe(5)
      expect(store.recycleStats.totalRecycled).toBe(50)
      expect(store.recycleStats.inStockAssets).toBe(20)
    })

    it('wasteStats 应该反映 overview 数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({
        total_assets: 100,
        active_assets: 80,
        in_stock_assets: 20,
        monthly_distributed: 10,
        monthly_recycled: 5,
        pending_waste: 3,
        wasted_assets: 2,
        total_recycled: 50,
        total_distributed: 60,
        timestamp: '2026-01-01T00:00:00Z',
      })

      await store.fetchDashboardOverview()

      expect(store.wasteStats.pendingWaste).toBe(3)
      expect(store.wasteStats.wastedAssets).toBe(2)
    })
  })

  describe('fetchRecentOutAssets', () => {
    it('应该获取最近发放记录', async () => {
      const mockData = [
        {
          id: 1,
          asset_name: '电脑',
          asset_code: 'A001',
          distribute_time: '2026-01-01',
          recipient_name: '张三',
          department_name: '技术部',
        },
      ]
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getRecentOutAssets).mockResolvedValue(mockData as any)

      const result = await store.fetchRecentOutAssets()

      expect(result).toEqual(mockData)
      expect(store.recentOutAssets).toEqual(mockData)
      expect(store.outAssetsLoading).toBe(false)
    })

    it('应支持limit参数', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getRecentOutAssets).mockResolvedValue([])

      await store.fetchRecentOutAssets(3)

      expect(dashboardAPI.getRecentOutAssets).toHaveBeenCalledWith(3)
    })

    it('API失败时应显示错误消息', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const { ElMessage } = await import('element-plus')
      vi.mocked(dashboardAPI.getRecentOutAssets).mockRejectedValue(new Error('网络错误'))

      await expect(store.fetchRecentOutAssets()).rejects.toThrow('网络错误')
      expect(ElMessage.error).toHaveBeenCalledWith('获取最近发放记录失败')
      expect(store.outAssetsLoading).toBe(false)
    })
  })

  describe('fetchRecentRecycleAssets', () => {
    it('应该获取最近回收记录', async () => {
      const mockData = [
        {
          id: 1,
          asset_name: '显示器',
          asset_code: 'B001',
          recycle_time: '2026-01-01',
          operator_name: '李四',
        },
      ]
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getRecentRecycleAssets).mockResolvedValue(mockData as any)

      const result = await store.fetchRecentRecycleAssets()

      expect(result).toEqual(mockData)
      expect(store.recentRecycleAssets).toEqual(mockData)
      expect(store.recycleAssetsLoading).toBe(false)
    })

    it('应支持limit参数', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getRecentRecycleAssets).mockResolvedValue([])

      await store.fetchRecentRecycleAssets(10)

      expect(dashboardAPI.getRecentRecycleAssets).toHaveBeenCalledWith(10)
    })

    it('API失败时应显示错误消息', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const { ElMessage } = await import('element-plus')
      vi.mocked(dashboardAPI.getRecentRecycleAssets).mockRejectedValue(new Error('网络错误'))

      await expect(store.fetchRecentRecycleAssets()).rejects.toThrow('网络错误')
      expect(ElMessage.error).toHaveBeenCalledWith('获取最近回收记录失败')
      expect(store.recycleAssetsLoading).toBe(false)
    })
  })

  describe('initDashboardData', () => {
    it('应该同时初始化所有数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({
        total_assets: 50,
        active_assets: 40,
        in_stock_assets: 10,
        monthly_distributed: 5,
        monthly_recycled: 2,
        pending_waste: 1,
        wasted_assets: 0,
        total_recycled: 20,
        total_distributed: 30,
        timestamp: '2026-01-01T00:00:00Z',
      })
      vi.mocked(dashboardAPI.getRecentOutAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getRecentRecycleAssets).mockResolvedValue([])

      await store.initDashboardData()

      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalled()
      expect(dashboardAPI.getRecentOutAssets).toHaveBeenCalledWith(5)
      expect(dashboardAPI.getRecentRecycleAssets).toHaveBeenCalledWith(5)
    })

    it('API失败时不应抛出异常', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockRejectedValue(new Error('网络错误'))

      await expect(store.initDashboardData()).resolves.toBeUndefined()
    })
  })

  describe('refreshStats', () => {
    it('部分API失败时不应阻止其他请求', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockRejectedValue(new Error('失败'))
      vi.mocked(dashboardAPI.getRecentOutAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getRecentRecycleAssets).mockResolvedValue([])

      await expect(store.refreshStats()).rejects.toThrow('失败')
    })
  })

  describe('formatNumber', () => {
    it('小于10000时返回千分位格式', () => {
      expect(store.formatNumber(0)).toBe('0')
      expect(store.formatNumber(1234)).toBe('1,234')
      expect(store.formatNumber(9999)).toBe('9,999')
    })

    it('大于等于10000时返回万为单位', () => {
      expect(store.formatNumber(10000)).toBe('1.0万')
      expect(store.formatNumber(15678)).toBe('1.6万')
      expect(store.formatNumber(100000)).toBe('10.0万')
    })
  })

  describe('formatCurrency', () => {
    it('应该正确格式化金额', () => {
      expect(store.formatCurrency(0)).toBe('¥0')
      expect(store.formatCurrency(1234)).toBe('¥1,234')
      expect(store.formatCurrency(1000000)).toBe('¥1,000,000')
    })
  })
})
