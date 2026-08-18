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

vi.mock('@/utils/statusMapping', () => ({
  getStatusColor: vi.fn((status: string) => {
    const map: Record<string, string> = {
      in_store: '#52C41A',
      in_use: '#2B5FD7',
      damaged: '#FAAD14',
    }
    return map[status] || '#909399'
  }),
  // [新增] 状态图表颜色映射
  ASSET_STATUS_CHART_COLORS: {
    in_store: '#52C41A',
    in_use: '#2B5FD7',
    recycled_pending: '#13C2C2',
    broken: '#FF4D4F',
    repairing: '#FAAD14',
    lost: '#F759AB',
    damaged: '#FA8C16',
    scrapped: '#909399',
  },
}))

describe('DashboardStore', () => {
  let store: ReturnType<typeof useDashboardStore>
  const mockOverview = {
    total_assets: 100,
    total_value: 50000, // [新增]
    total_contracts: 5, // [新增]
    active_assets: 80,
    in_stock_assets: 20,
    monthly_distributed: 10,
    monthly_recycled: 5,
    pending_waste: 3,
    wasted_assets: 2,
    total_recycled: 50,
    total_distributed: 60,
    status_distribution: {
      // [新增]
      in_store: { name: '在库', count: 20 },
      in_use: { name: '在用', count: 80 },
      recycled_pending: { name: '已回收待发放', count: 5 },
      broken: { name: '已损坏', count: 3 },
      repairing: { name: '维修中', count: 2 },
      lost: { name: '已遗失', count: 1 },
      damaged: { name: '待报废', count: 3 },
      scrapped: { name: '已报废', count: 2 },
    },
    timestamp: '2026-01-01T00:00:00Z',
  }

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
      expect(ElMessage.error).toHaveBeenCalledWith('网络错误')
      expect(store.overviewLoading).toBe(false)
    })
  })

  describe('refreshStats', () => {
    it('应该同时刷新所有数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({
        total_assets: 50,
        total_value: 0,
        total_contracts: 0,
        active_assets: 40,
        in_stock_assets: 10,
        monthly_distributed: 5,
        monthly_recycled: 2,
        pending_waste: 1,
        wasted_assets: 0,
        total_recycled: 20,
        total_distributed: 30,
        status_distribution: {},
        timestamp: '2026-01-01T00:00:00Z',
      })
      vi.mocked(dashboardAPI.getRecentOutAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getRecentRecycleAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getAssetTrend).mockResolvedValue([])
      vi.mocked(dashboardAPI.getDepartmentDistribution).mockResolvedValue([])
      vi.mocked(dashboardAPI.getAssetTypeDistribution).mockResolvedValue([])
      vi.mocked(dashboardAPI.getExpiringAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getMaintenanceReminders).mockResolvedValue([])

      await store.refreshStats()

      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalled()
      expect(dashboardAPI.getRecentOutAssets).toHaveBeenCalled()
      expect(dashboardAPI.getRecentRecycleAssets).toHaveBeenCalled()
      expect(dashboardAPI.getAssetTrend).toHaveBeenCalled()
      expect(dashboardAPI.getDepartmentDistribution).toHaveBeenCalled()
      expect(dashboardAPI.getAssetTypeDistribution).toHaveBeenCalled()
      expect(dashboardAPI.getExpiringAssets).toHaveBeenCalled()
      expect(dashboardAPI.getMaintenanceReminders).toHaveBeenCalled()
    })
  })

  describe('clearCache', () => {
    it('应该清除所有缓存数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({
        total_assets: 100,
        total_value: 0,
        total_contracts: 0,
        active_assets: 80,
        in_stock_assets: 20,
        monthly_distributed: 10,
        monthly_recycled: 5,
        pending_waste: 3,
        wasted_assets: 2,
        total_recycled: 50,
        total_distributed: 60,
        status_distribution: {},
        timestamp: '2026-01-01T00:00:00Z',
      })
      vi.mocked(dashboardAPI.getRecentOutAssets).mockResolvedValue([
        {
          id: 1,
          asset_name: '电脑',
          asset_code: 'A001',
          outasset_date: '',
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
      expect(store.getStatusColor('in_use')).toBe('#2B5FD7')
      expect(store.getStatusColor('damaged')).toBe('#FAAD14')
      expect(store.getStatusColor('unknown')).toBe('#909399')
    })
  })

  describe('计算属性', () => {
    it('distributeStats 应该反映 overview 数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({
        total_assets: 100,
        total_value: 0,
        total_contracts: 0,
        active_assets: 80,
        in_stock_assets: 20,
        monthly_distributed: 10,
        monthly_recycled: 5,
        pending_waste: 3,
        wasted_assets: 2,
        total_recycled: 50,
        total_distributed: 60,
        status_distribution: {},
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
        total_value: 0,
        total_contracts: 0,
        active_assets: 80,
        in_stock_assets: 20,
        monthly_distributed: 10,
        monthly_recycled: 5,
        pending_waste: 3,
        wasted_assets: 2,
        total_recycled: 50,
        total_distributed: 60,
        status_distribution: {},
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
        total_value: 0,
        total_contracts: 0,
        active_assets: 80,
        in_stock_assets: 20,
        monthly_distributed: 10,
        monthly_recycled: 5,
        pending_waste: 3,
        wasted_assets: 2,
        total_recycled: 50,
        total_distributed: 60,
        status_distribution: {},
        timestamp: '2026-01-01T00:00:00Z',
      })

      await store.fetchDashboardOverview()

      expect(store.wasteStats.pendingWaste).toBe(3)
      expect(store.wasteStats.wastedAssets).toBe(2)
    })

    it('statusOverview 应该正确分组并计算图表数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue(mockOverview)

      await store.fetchDashboardOverview()

      // 正常资产分组: 20+80+5 = 105
      const normalGroup = store.statusOverview.groups.find((g) => g.key === 'normal')
      expect(normalGroup).toBeDefined()
      expect(normalGroup!.total).toBe(105)
      expect(normalGroup!.items).toHaveLength(3)

      // 异常资产分组: 3+2+1 = 6
      const abnormalGroup = store.statusOverview.groups.find((g) => g.key === 'abnormal')
      expect(abnormalGroup).toBeDefined()
      expect(abnormalGroup!.total).toBe(6)

      // 报废流程分组: 3+2 = 5
      const scrapGroup = store.statusOverview.groups.find((g) => g.key === 'scrap')
      expect(scrapGroup).toBeDefined()
      expect(scrapGroup!.total).toBe(5)

      // 图表数据应包含全部 8 种状态
      expect(store.statusOverview.chartData).toHaveLength(8)
      expect(store.statusOverview.totalAssets).toBe(100)
    })

    it('statusOverview 应过滤零值状态', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({
        ...mockOverview,
        status_distribution: {
          in_store: { name: '在库', count: 20 },
          in_use: { name: '在用', count: 0 },
          broken: { name: '已损坏', count: 0 },
        },
      })

      await store.fetchDashboardOverview()

      const normalGroup = store.statusOverview.groups.find((g) => g.key === 'normal')
      expect(normalGroup!.items).toHaveLength(1) // 仅 in_store

      expect(store.statusOverview.chartData).toHaveLength(1)
    })

    it('statusOverview 无数据时返回空结构', () => {
      expect(store.statusOverview.groups).toHaveLength(3) // 三个分组
      expect(store.statusOverview.chartData).toHaveLength(0)
      expect(store.statusOverview.totalAssets).toBe(0)
    })
  })

  describe('fetchRecentOutAssets', () => {
    it('应该获取最近发放记录', async () => {
      const mockData = [
        {
          id: 1,
          asset_name: '电脑',
          asset_code: 'A001',
          outasset_date: '2026-01-01',
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
      expect(ElMessage.error).toHaveBeenCalledWith('网络错误')
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
          recycle_asset_date: '2026-01-01',
          returner_name: '李四',
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
      expect(ElMessage.error).toHaveBeenCalledWith('网络错误')
      expect(store.recycleAssetsLoading).toBe(false)
    })
  })

  describe('fetchAssetTrend', () => {
    it('应该获取趋势数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const mockTrend = [
        { date: '2026-01-01', new_assets: 5, distributed: 0, recovered: 0, scrapped: 0 },
      ]
      vi.mocked(dashboardAPI.getAssetTrend).mockResolvedValue(mockTrend)

      const result = await store.fetchAssetTrend()

      expect(result).toEqual(mockTrend)
      expect(store.assetTrend).toEqual(mockTrend)
      expect(store.trendLoading).toBe(false)
    })

    it('应支持日期范围参数', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getAssetTrend).mockResolvedValue([])

      await store.fetchAssetTrend({ start_date: '2026-01-01', end_date: '2026-01-31' })

      expect(dashboardAPI.getAssetTrend).toHaveBeenCalledWith({
        start_date: '2026-01-01',
        end_date: '2026-01-31',
      })
    })

    it('API失败时应显示错误消息', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const { ElMessage } = await import('element-plus')
      vi.mocked(dashboardAPI.getAssetTrend).mockRejectedValue(new Error('失败'))

      await expect(store.fetchAssetTrend()).rejects.toThrow('失败')
      expect(ElMessage.error).toHaveBeenCalledWith('失败')
      expect(store.trendLoading).toBe(false)
    })
  })

  describe('fetchDepartmentDistribution', () => {
    it('应该获取部门分布', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const mockData = [{ department_name: '技术部', asset_count: 50, percentage: 50 }]
      vi.mocked(dashboardAPI.getDepartmentDistribution).mockResolvedValue(mockData)

      const result = await store.fetchDepartmentDistribution()

      expect(result).toEqual(mockData)
      expect(store.departmentDistribution).toEqual(mockData)
      expect(store.deptDistLoading).toBe(false)
    })

    it('API失败时应显示错误消息', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const { ElMessage } = await import('element-plus')
      vi.mocked(dashboardAPI.getDepartmentDistribution).mockRejectedValue(new Error('失败'))

      await expect(store.fetchDepartmentDistribution()).rejects.toThrow('失败')
      expect(ElMessage.error).toHaveBeenCalledWith('失败')
    })
  })

  describe('fetchAssetTypeDistribution', () => {
    it('应该获取类型分布', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const mockData = [{ type_name: '笔记本', count: 30, percentage: 30 }]
      vi.mocked(dashboardAPI.getAssetTypeDistribution).mockResolvedValue(mockData)

      const result = await store.fetchAssetTypeDistribution()

      expect(result).toEqual(mockData)
      expect(store.assetTypeDistribution).toEqual(mockData)
      expect(store.typeDistLoading).toBe(false)
    })

    it('API失败时应显示错误消息', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const { ElMessage } = await import('element-plus')
      vi.mocked(dashboardAPI.getAssetTypeDistribution).mockRejectedValue(new Error('失败'))

      await expect(store.fetchAssetTypeDistribution()).rejects.toThrow('失败')
      expect(ElMessage.error).toHaveBeenCalledWith('失败')
    })
  })

  describe('fetchExpiringAssets', () => {
    it('应该获取即将到期资产', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const mockData = [
        {
          id: 1,
          asset_name: '电脑',
          asset_code: 'A001',
          expire_date: '2026-02-01',
          days_until_expire: 14,
        },
      ]
      vi.mocked(dashboardAPI.getExpiringAssets).mockResolvedValue(mockData as any)

      const result = await store.fetchExpiringAssets()

      expect(result).toEqual(mockData)
      expect(store.expiringAssets).toEqual(mockData)
      expect(store.expiringLoading).toBe(false)
    })

    it('应支持days参数', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getExpiringAssets).mockResolvedValue([])

      await store.fetchExpiringAssets(7)

      expect(dashboardAPI.getExpiringAssets).toHaveBeenCalledWith(7)
    })

    it('API失败时应显示错误消息', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const { ElMessage } = await import('element-plus')
      vi.mocked(dashboardAPI.getExpiringAssets).mockRejectedValue(new Error('失败'))

      await expect(store.fetchExpiringAssets()).rejects.toThrow('失败')
      expect(ElMessage.error).toHaveBeenCalledWith('失败')
    })
  })

  describe('fetchMaintenanceReminders', () => {
    it('应该获取维护提醒', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const mockData = [
        {
          id: 1,
          asset_name: '打印机',
          asset_code: 'C001',
          maintenance_date: '2026-02-01',
          type: '定期维护',
        },
      ]
      vi.mocked(dashboardAPI.getMaintenanceReminders).mockResolvedValue(mockData as any)

      const result = await store.fetchMaintenanceReminders()

      expect(result).toEqual(mockData)
      expect(store.maintenanceReminders).toEqual(mockData)
      expect(store.maintenanceLoading).toBe(false)
    })

    it('API失败时应显示错误消息', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      const { ElMessage } = await import('element-plus')
      vi.mocked(dashboardAPI.getMaintenanceReminders).mockRejectedValue(new Error('失败'))

      await expect(store.fetchMaintenanceReminders()).rejects.toThrow('失败')
      expect(ElMessage.error).toHaveBeenCalledWith('失败')
    })
  })

  describe('initDashboardData', () => {
    it('应该同时初始化所有数据', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockResolvedValue({
        total_assets: 50,
        total_value: 0,
        total_contracts: 0,
        active_assets: 40,
        in_stock_assets: 10,
        monthly_distributed: 5,
        monthly_recycled: 2,
        pending_waste: 1,
        wasted_assets: 0,
        total_recycled: 20,
        total_distributed: 30,
        status_distribution: {},
        timestamp: '2026-01-01T00:00:00Z',
      })
      vi.mocked(dashboardAPI.getRecentOutAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getRecentRecycleAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getAssetTrend).mockResolvedValue([])
      vi.mocked(dashboardAPI.getDepartmentDistribution).mockResolvedValue([])
      vi.mocked(dashboardAPI.getAssetTypeDistribution).mockResolvedValue([])
      vi.mocked(dashboardAPI.getExpiringAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getMaintenanceReminders).mockResolvedValue([])

      await store.initDashboardData()

      expect(dashboardAPI.getDashboardOverview).toHaveBeenCalled()
      expect(dashboardAPI.getRecentOutAssets).toHaveBeenCalledWith(5)
      expect(dashboardAPI.getRecentRecycleAssets).toHaveBeenCalledWith(5)
      expect(dashboardAPI.getAssetTrend).toHaveBeenCalled()
      expect(dashboardAPI.getDepartmentDistribution).toHaveBeenCalled()
      expect(dashboardAPI.getAssetTypeDistribution).toHaveBeenCalled()
      expect(dashboardAPI.getExpiringAssets).toHaveBeenCalled()
      expect(dashboardAPI.getMaintenanceReminders).toHaveBeenCalled()
    })

    it('API失败时不应抛出异常', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockRejectedValue(new Error('网络错误'))
      vi.mocked(dashboardAPI.getRecentOutAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getRecentRecycleAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getAssetTrend).mockResolvedValue([])
      vi.mocked(dashboardAPI.getDepartmentDistribution).mockResolvedValue([])
      vi.mocked(dashboardAPI.getAssetTypeDistribution).mockResolvedValue([])
      vi.mocked(dashboardAPI.getExpiringAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getMaintenanceReminders).mockResolvedValue([])

      await expect(store.initDashboardData()).rejects.toThrow('网络错误')
    })
  })

  describe('refreshStats', () => {
    it('部分API失败时不应阻止其他请求', async () => {
      const { dashboardAPI } = await import('@/api/dashboard')
      vi.mocked(dashboardAPI.getDashboardOverview).mockRejectedValue(new Error('失败'))
      vi.mocked(dashboardAPI.getRecentOutAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getRecentRecycleAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getAssetTrend).mockResolvedValue([])
      vi.mocked(dashboardAPI.getDepartmentDistribution).mockResolvedValue([])
      vi.mocked(dashboardAPI.getAssetTypeDistribution).mockResolvedValue([])
      vi.mocked(dashboardAPI.getExpiringAssets).mockResolvedValue([])
      vi.mocked(dashboardAPI.getMaintenanceReminders).mockResolvedValue([])

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
