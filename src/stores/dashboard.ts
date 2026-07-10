/**
 * 仪表盘 Store
 * 负责仪表盘数据管理、缓存和状态更新
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  dashboardAPI,
  // [MR-10] DashboardStats 类型已删除 — /dashboard/stats/ 端点废弃
  type DashboardOverview,
  type OutAssetRecord,
  type RecycleAssetRecord
} from '@/api/dashboard'
import { ElMessage } from 'element-plus'

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

  // 状态 - 加载状态
  // [MR-10] loading 已删除 — 仅与旧 stats 关联
  const overviewLoading = ref(false)
  const outAssetsLoading = ref(false)
  const recycleAssetsLoading = ref(false)

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
        totalAssets: 0
      }
    }

    return {
      monthlyDistributed: overview.value.monthly_distributed,
      totalDistributed: overview.value.total_distributed,
      totalAssets: overview.value.total_assets
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
        inStockAssets: 0
      }
    }

    return {
      monthlyRecycled: overview.value.monthly_recycled,
      totalRecycled: overview.value.total_recycled,
      inStockAssets: overview.value.in_stock_assets
    }
  })

  /**
   * 计算属性 - 报废统计
   */
  const wasteStats = computed(() => {
    if (!overview.value) {
      return {
        pendingWaste: 0,
        wastedAssets: 0
      }
    }

    return {
      pendingWaste: overview.value.pending_waste,
      wastedAssets: overview.value.wasted_assets
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
      console.error('获取仪表盘概览数据失败:', error)
      ElMessage.error('获取仪表盘概览数据失败')
      throw error
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
      console.error('获取最近发放记录失败:', error)
      ElMessage.error('获取最近发放记录失败')
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
      console.error('获取最近回收记录失败:', error)
      ElMessage.error('获取最近回收记录失败')
      throw error
    } finally {
      recycleAssetsLoading.value = false
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
      fetchRecentRecycleAssets()
    ])
  }

  /**
   * 初始化所有数据
   */
  const initDashboardData = async () => {
    try {
      await Promise.all([
        fetchDashboardOverview(),
        fetchRecentOutAssets(5),
        fetchRecentRecycleAssets(5)
      ])
    } catch (error) {
      console.error('初始化仪表盘数据失败:', error)
    }
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
   * 工具方法 - 获取状态颜色
   * @param status 状态
   * @returns 颜色值
   */
  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      '在库': '#67C23A',
      '使用中': '#409EFF',
      '维修中': '#E6A23C',
      '报废': '#F56C6C',
      '待报废': '#909399'
    }
    return colorMap[status] || '#909399'
  }

  /**
   * 工具方法 - 清除缓存
   */
  const clearCache = () => {
    // [MR-10] stats.value 和 lastUpdateTime 已删除
    overview.value = null
    recentOutAssets.value = []
    recentRecycleAssets.value = []
    overviewLastUpdateTime.value = null
  }

  return {
    // 状态
    // [MR-10] stats 已删除 — DashboardStats 类型废弃
    overview,
    recentOutAssets,
    recentRecycleAssets,
    // [MR-10] loading 已删除 — 仅与旧 stats 关联
    overviewLoading,
    outAssetsLoading,
    recycleAssetsLoading,
    // [MR-10] lastUpdateTime 已删除 — 仅与旧 stats 关联
    overviewLastUpdateTime,

    // 计算属性
    // [MR-10] assetSummary / monthlyActivity / departmentDistribution / statusDistribution / valueStats 已删除
    distributeStats,
    recycleStats,
    wasteStats,

    // 操作方法
    fetchDashboardOverview,
    fetchRecentOutAssets,
    fetchRecentRecycleAssets,
    refreshStats,
    initDashboardData,
    clearCache,

    // 工具方法
    formatNumber,
    formatCurrency,
    getStatusColor
  }
})
