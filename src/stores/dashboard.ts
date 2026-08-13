/**
 * @file 仪表盘 Store，管理概览数据、发放/回收记录、统计计算与缓存
 * @module stores/dashboard
 * @exports
 *   - useDashboardStore: 仪表盘数据状态 Store
 * @callers
 *   - composables/useDashboardPage.ts
 *   - components/DashboardPage.vue
 * @dependsOn
 *   - api/dashboard: 仪表盘 API 接口
 *   - types/dashboard: 仪表盘相关类型定义
 *   - utils/statusMapping: 状态颜色映射工具
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { isAxiosError } from 'axios'
import { dashboardAPI } from '@/api/dashboard'
import type { DashboardOverview, OutAssetRecord, RecycleAssetRecord } from '@/types/dashboard'
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
   * [新增] 状态分组定义：正常资产 / 异常资产 / 报废流程
   * 每项包含：状态码、中文标签、颜色、所属分组
   */
  const STATUS_GROUPS = {
    normal: {
      label: '正常资产',
      color: '#52C41A',
      items: ['in_store', 'in_use', 'recycled_pending'] as string[],
    },
    abnormal: {
      label: '异常资产',
      color: '#FAAD14',
      items: ['broken', 'repairing', 'lost'] as string[],
    },
    scrap: {
      label: '报废流程',
      color: '#909399',
      items: ['damaged', 'scrapped'] as string[],
    },
  } as const

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
   * 刷新所有数据
   * @returns Promise 数组
   */
  const refreshStats = () => {
    return Promise.all([
      fetchDashboardOverview(true),
      fetchRecentOutAssets(),
      fetchRecentRecycleAssets(),
    ])
  }

  /**
   * 初始化所有数据
   */
  // initDashboardData catch 块重构
  const initDashboardData = async () => {
    // [修复] 移除 catch 吞错，让错误冒泡到 composable 层
    await Promise.all([
      fetchDashboardOverview(),
      fetchRecentOutAssets(5),
      fetchRecentRecycleAssets(5),
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
    // [新增] 状态全景
    statusOverview,
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
    getStatusColor,
  }
})
