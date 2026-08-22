/**
 * @file 仪表盘 Store — 概览、记录、趋势、分布、告警
 * @module stores/dashboard
 */
import { defineStore } from 'pinia'
import { STATUS_GROUPS } from './dashboardStatusGroups'
import { ref, computed } from 'vue'
import { isAxiosError } from 'axios'
import { dashboardAPI } from '@/api/dashboard'
import type {
  DashboardOverview,
  OutAssetRecord,
  RecycleAssetRecord,
  AssetTrendData,
  ExpiringAsset,
  MaintenanceReminder,
  DepartmentDistributionItem,
  AssetTypeDistributionItem,
} from '@/types/dashboard'
import { ElMessage } from 'element-plus'
import {
  getStatusColor as getStatusColorFromMapping,
  ASSET_STATUS_CHART_COLORS,
} from '@/utils/statusMapping'

/**
 * 仪表盘 Store
 */
export const useDashboardStore = defineStore('dashboard', () => {
  // [MR-10] stats 状态已删除 — DashboardStats 类型废弃，统一使用 overview

  // 状态 - 新扩展的概览数据
  const overview = ref<DashboardOverview | null>(null)

  // 状态 - 最近发放记录
  const recentOutAssets = ref<OutAssetRecord[]>([])

  // 状态 - 最近回收记录
  const recentRecycleAssets = ref<RecycleAssetRecord[]>([])

  // [M-10] 新增5个仪表盘数据状态
  const assetTrend = ref<AssetTrendData[]>([])
  const departmentDistribution = ref<DepartmentDistributionItem[]>([])
  const assetTypeDistribution = ref<AssetTypeDistributionItem[]>([])
  const expiringAssets = ref<ExpiringAsset[]>([])
  const maintenanceReminders = ref<MaintenanceReminder[]>([])

  // 状态 - 加载状态
  // [MR-10] loading 已删除 — 仅与旧 stats 关联
  const overviewLoading = ref(false)
  const outAssetsLoading = ref(false)
  const recycleAssetsLoading = ref(false)
  const trendLoading = ref(false)
  const deptDistLoading = ref(false)
  const typeDistLoading = ref(false)
  const expiringLoading = ref(false)
  const maintenanceLoading = ref(false)

  // [M-10] 竞态保护：trend 请求计数器，仅最后一次请求结果生效
  let trendRequestId = 0

  // 状态 - 最后更新时间
  // [MR-10] lastUpdateTime 已删除 — 仅与旧 stats 关联，overviewLastUpdateTime 独立保留
  const overviewLastUpdateTime = ref<Date | null>(null)

  /**
   * 计算属性 - 资产发放统计
   */
  const distributeStats = computed(() => {
    if (!overview.value) {
      return {
        monthlyDistributed: 0,
        totalDistributed: 0,
        totalAssets: 0,
      }
    }

    return {
      monthlyDistributed: overview.value.monthly_distributed,
      totalDistributed: overview.value.total_distributed,
      totalAssets: overview.value.total_assets,
    }
  })

  /**
   * 计算属性 - 资产回收统计
   */
  const recycleStats = computed(() => {
    if (!overview.value) {
      return {
        monthlyRecycled: 0,
        totalRecycled: 0,
        inStockAssets: 0,
      }
    }

    return {
      monthlyRecycled: overview.value.monthly_recycled,
      totalRecycled: overview.value.total_recycled,
      inStockAssets: overview.value.in_stock_assets,
    }
  })

  /**
   * 计算属性 - 报废统计
   */
  const wasteStats = computed(() => {
    if (!overview.value) {
      return {
        pendingWaste: 0,
        wastedAssets: 0,
      }
    }

    return {
      pendingWaste: overview.value.pending_waste,
      wastedAssets: overview.value.wasted_assets,
    }
  })


  /**
   * [新增] 计算属性 - 资产状态全景数据
   * 返回分组列表 + 环形图数据。
   * 分组计算和图表数据均基于后端 status_distribution 透传，避免前端硬编码状态枚举。
   */
  const statusOverview = computed(() => {
    const dist = overview.value?.status_distribution || {}

    // 分组聚合
    const groups = Object.entries(STATUS_GROUPS).map(([groupKey, group]) => {
      const groupItems = group.items
        .map((statusCode) => {
          const item = dist[statusCode]
          return {
            code: statusCode,
            name: item?.name || statusCode,
            count: item?.count || 0,
            color: ASSET_STATUS_CHART_COLORS[statusCode] || '#909399',
          }
        })
        .filter((item) => item.count > 0) // 仅展示有数据的项

      const total = groupItems.reduce((sum, item) => sum + item.count, 0)
      return {
        key: groupKey,
        label: group.label,
        color: group.color,
        total,
        items: groupItems,
      }
    })

    // 环形图数据（所有8种状态，按自定义顺序排列）
    const chartOrder = [
      'in_use',
      'in_store',
      'recycled_pending',
      'broken',
      'repairing',
      'lost',
      'damaged',
      'scrapped',
    ]
    const chartData = chartOrder
      .filter((code) => (dist[code]?.count || 0) > 0)
      .map((code) => ({
        name: dist[code]?.name || code,
        value: dist[code]?.count || 0,
        itemStyle: { color: ASSET_STATUS_CHART_COLORS[code] || '#909399' },
      }))

    const totalAssets = overview.value?.total_assets || 0

    return {
      groups,
      chartData,
      totalAssets,
    }
  })

  // [MR-10] assetSummary / monthlyActivity / departmentDistribution / statusDistribution / valueStats
  // 计算属性已删除 — 均依赖旧 DashboardStats 类型，无组件使用

  /**
   * 获取仪表盘概览数据（新版本）
   * @param forceRefresh 是否强制刷新
   * @returns 仪表盘概览数据
   */
  const fetchDashboardOverview = async (forceRefresh = false) => {
    if (overview.value && !forceRefresh && overviewLastUpdateTime.value) {
      const timeDiff = Date.now() - overviewLastUpdateTime.value.getTime()
      if (timeDiff < 5 * 60 * 1000) {
        return overview.value
      }
    }

    overviewLoading.value = true
    try {
      const data = await dashboardAPI.getDashboardOverview()
      overview.value = data
      overviewLastUpdateTime.value = new Date()
      return data
    } catch (error) {
      // fetchDashboardOverview catch 块重构
      console.error('获取仪表盘概览数据失败:', error)
      // [修复] 分类处理：业务错误拦截器未处理，需手动提示实际原因
      if (!isAxiosError(error)) {
        ElMessage.error((error as Error).message || '获取仪表盘概览数据失败')
      }
      // AxiosError 由拦截器已弹窗，不重复
      throw error // [修复] 保持 re-throw，让上层感知
    } finally {
      overviewLoading.value = false
    }
  }

  /**
   * 获取最近发放记录
   * @param limit 记录数量限制
   * @returns 发放记录列表
   */
  const fetchRecentOutAssets = async (limit?: number) => {
    outAssetsLoading.value = true
    try {
      const data = await dashboardAPI.getRecentOutAssets(limit)
      recentOutAssets.value = data
      return data
    } catch (error) {
      // fetchRecentOutAssets catch 块重构（同上模式）
      console.error('获取最近发放记录失败:', error)
      if (!isAxiosError(error)) {
        ElMessage.error((error as Error).message || '获取最近发放记录失败')
      }
      throw error
    } finally {
      outAssetsLoading.value = false
    }
  }

  /**
   * 获取最近回收记录
   * @param limit 记录数量限制
   * @returns 回收记录列表
   */
  const fetchRecentRecycleAssets = async (limit?: number) => {
    recycleAssetsLoading.value = true
    try {
      const data = await dashboardAPI.getRecentRecycleAssets(limit)
      recentRecycleAssets.value = data
      return data
    } catch (error) {
      // fetchRecentRecycleAssets catch 块重构（同上模式）
      console.error('获取最近回收记录失败:', error)
      if (!isAxiosError(error)) {
        ElMessage.error((error as Error).message || '获取最近回收记录失败')
      }
      throw error
    } finally {
      recycleAssetsLoading.value = false
    }
  }

  /**
   * [M-10] 获取资产趋势数据（带竞态保护）
   * @param params 可选 start_date/end_date，不传时回退到最近30天
   */
  const fetchAssetTrend = async (params?: { start_date?: string; end_date?: string }) => {
    trendLoading.value = true
    const requestId = ++trendRequestId
    try {
      const data = await dashboardAPI.getAssetTrend(params)
      // 仅最后一次请求的结果生效，丢弃过期响应
      if (requestId === trendRequestId) {
        assetTrend.value = data
      }
      return data
    } catch (error) {
      // 仅最新请求的错误才展示，过期请求的错误静默丢弃
      if (requestId === trendRequestId) {
        console.error('获取资产趋势数据失败:', error)
        if (!isAxiosError(error)) {
          ElMessage.error((error as Error).message || '获取资产趋势数据失败')
        }
      }
      throw error
    } finally {
      // 仅最新请求才清除 loading，避免中间态闪烁
      if (requestId === trendRequestId) {
        trendLoading.value = false
      }
    }
  }

  /**
   * [M-10] 获取部门资产分布
   */
  const fetchDepartmentDistribution = async () => {
    deptDistLoading.value = true
    try {
      const data = await dashboardAPI.getDepartmentDistribution()
      departmentDistribution.value = data
      return data
    } catch (error) {
      console.error('获取部门分布数据失败:', error)
      if (!isAxiosError(error)) {
        ElMessage.error((error as Error).message || '获取部门分布数据失败')
      }
      throw error
    } finally {
      deptDistLoading.value = false
    }
  }

  /**
   * [M-10] 获取资产类型分布
   */
  const fetchAssetTypeDistribution = async () => {
    typeDistLoading.value = true
    try {
      const data = await dashboardAPI.getAssetTypeDistribution()
      assetTypeDistribution.value = data
      return data
    } catch (error) {
      console.error('获取类型分布数据失败:', error)
      if (!isAxiosError(error)) {
        ElMessage.error((error as Error).message || '获取类型分布数据失败')
      }
      throw error
    } finally {
      typeDistLoading.value = false
    }
  }

  /**
   * [M-10] 获取即将到期资产
   * @param days 查询天数范围，默认30天
   */
  const fetchExpiringAssets = async (days?: number) => {
    expiringLoading.value = true
    try {
      const data = await dashboardAPI.getExpiringAssets(days)
      expiringAssets.value = data
      return data
    } catch (error) {
      console.error('获取即将到期资产失败:', error)
      if (!isAxiosError(error)) {
        ElMessage.error((error as Error).message || '获取即将到期资产失败')
      }
      throw error
    } finally {
      expiringLoading.value = false
    }
  }

  /**
   * [M-10] 获取维护提醒
   */
  const fetchMaintenanceReminders = async () => {
    maintenanceLoading.value = true
    try {
      const data = await dashboardAPI.getMaintenanceReminders()
      maintenanceReminders.value = data
      return data
    } catch (error) {
      console.error('获取维护提醒失败:', error)
      if (!isAxiosError(error)) {
        ElMessage.error((error as Error).message || '获取维护提醒失败')
      }
      throw error
    } finally {
      maintenanceLoading.value = false
    }
  }

  /**
   * 刷新所有数据
   * @returns Promise 数组
   */
  const refreshStats = () => {
    return Promise.all([
      fetchDashboardOverview(true),
      fetchRecentOutAssets(),
      fetchRecentRecycleAssets(),
      fetchAssetTrend(),
      fetchDepartmentDistribution(),
      fetchAssetTypeDistribution(),
      fetchExpiringAssets(),
      fetchMaintenanceReminders(),
    ])
  }

  /**
   * 初始化所有数据
   */
  const initDashboardData = async () => {
    await Promise.all([
      fetchDashboardOverview(),
      fetchRecentOutAssets(5),
      fetchRecentRecycleAssets(5),
      fetchAssetTrend(),
      fetchDepartmentDistribution(),
      fetchAssetTypeDistribution(),
      fetchExpiringAssets(),
      fetchMaintenanceReminders(),
    ])
  }

  /**
   * 工具方法 - 格式化数字显示
   * @param num 数字
   * @returns 格式化后的字符串
   */
  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toLocaleString()
  }

  /**
   * 工具方法 - 格式化金额显示
   * @param amount 金额
   * @returns 格式化后的字符串
   */
  const formatCurrency = (amount: number): string => {
    return '¥' + amount.toLocaleString()
  }

  /**
   * 工具方法 - 获取状态颜色（复用 statusMapping 中心化颜色映射）
   * @param status 状态
   * @returns 颜色值
   */
  const getStatusColor = (status: string): string => {
    return getStatusColorFromMapping(status)
  }

  /**
   * 工具方法 - 清除缓存
   */
  const clearCache = () => {
    overview.value = null
    recentOutAssets.value = []
    recentRecycleAssets.value = []
    assetTrend.value = []
    departmentDistribution.value = []
    assetTypeDistribution.value = []
    expiringAssets.value = []
    maintenanceReminders.value = []
    overviewLastUpdateTime.value = null
  }

  return {
    // 状态
    overview,
    recentOutAssets,
    recentRecycleAssets,
    assetTrend,
    departmentDistribution,
    assetTypeDistribution,
    expiringAssets,
    maintenanceReminders,
    statusOverview,
    // 加载状态
    overviewLoading,
    outAssetsLoading,
    recycleAssetsLoading,
    trendLoading,
    deptDistLoading,
    typeDistLoading,
    expiringLoading,
    maintenanceLoading,
    overviewLastUpdateTime,

    // 计算属性
    distributeStats,
    recycleStats,
    wasteStats,

    // 操作方法
    fetchDashboardOverview,
    fetchRecentOutAssets,
    fetchRecentRecycleAssets,
    fetchAssetTrend,
    fetchDepartmentDistribution,
    fetchAssetTypeDistribution,
    fetchExpiringAssets,
    fetchMaintenanceReminders,
    refreshStats,
    initDashboardData,
    clearCache,

    // 工具方法
    formatNumber,
    formatCurrency,
    getStatusColor,
  }
})
