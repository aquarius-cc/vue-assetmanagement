/**
 * @file 仪表盘 API，提供仪表盘概览、趋势数据、提醒信息等接口
 * @module api/dashboard
 * @exports
 *   - dashboardAPI: 仪表盘 API 对象（包含所有仪表盘相关方法）
 *   - DashboardOverview: 仪表盘概览类型
 *   - OutAssetRecord: 出库资产记录类型
 *   - RecycleAssetRecord: 回收资产记录类型
 *   - AssetTrendData: 资产趋势数据类型
 *   - ExpiringAsset: 即将过期资产类型
 *   - MaintenanceReminder: 维护提醒类型
 * @callers
 *   - stores/dashboard: 仪表盘状态管理
 * @dependsOn
 *   - api/request.ts: 使用 request 实例
 *   - types/dashboard: 仪表盘相关类型定义
 */
import { request, unwrapResponse } from '@/api/index'
import type {
  DashboardOverview,
  OutAssetRecord,
  RecycleAssetRecord,
  AssetTrendData,
  ExpiringAsset,
  MaintenanceReminder,
} from '@/types/dashboard'

export type {
  DashboardOverview,
  OutAssetRecord,
  RecycleAssetRecord,
  AssetTrendData,
  ExpiringAsset,
  MaintenanceReminder,
}

/**
 * 仪表盘 API
 */
export const dashboardAPI = {
  // [MR-10] getDashboardStats 方法已删除 — /dashboard/stats/ 端点废弃，统一使用 getDashboardOverview

  /**
   * 获取仪表盘概览数据（新版本）
   * @returns 仪表盘概览数据
   */
  getDashboardOverview: (): Promise<DashboardOverview> => {
    return unwrapResponse(request.get<DashboardOverview>('/dashboard/overview/'))
  },

  /**
   * 获取最近发放记录
   * @param limit 记录数量限制
   * @returns 发放记录列表
   */
  getRecentOutAssets: async (limit?: number): Promise<OutAssetRecord[]> => {
    return unwrapResponse(
      request.get<OutAssetRecord[]>('/dashboard/recent_out_assets/', { limit: limit || 10 }),
    )
  },

  /**
   * 获取最近回收记录
   * @param limit 记录数量限制
   * @returns 回收记录列表
   */
  getRecentRecycleAssets: async (limit?: number): Promise<RecycleAssetRecord[]> => {
    return unwrapResponse(
      request.get<RecycleAssetRecord[]>('/dashboard/recent_recycle_assets/', {
        limit: limit || 10,
      }),
    )
  },

  /**
   * 获取资产趋势数据
   * GET /api/dashboard/trend/
   * 注意：后端暂未实现此端点，调用会返回 404
   */
  getAssetTrend: async (params?: {
    start_date?: string
    end_date?: string
    period?: 'daily' | 'weekly' | 'monthly'
  }): Promise<AssetTrendData[]> => {
    if (import.meta.env.PROD) {
      console.warn('[dashboardAPI] getAssetTrend: 后端暂未实现此端点')
      return []
    }
    return unwrapResponse(request.get<AssetTrendData[]>('/dashboard/trend/', params))
  },

  /**
   * 获取部门资产分布
   * GET /api/dashboard/department_distribution/
   * 注意：后端暂未实现此端点，调用会返回 404
   */
  getDepartmentDistribution: async (): Promise<
    Array<{
      department_name: string
      asset_count: number
      percentage: number
    }>
  > => {
    if (import.meta.env.PROD) {
      console.warn('[dashboardAPI] getDepartmentDistribution: 后端暂未实现此端点')
      return []
    }
    return unwrapResponse(
      request.get<
        Array<{
          department_name: string
          asset_count: number
          percentage: number
        }>
      >('/dashboard/department_distribution/'),
    )
  },

  /**
   * 获取资产类型分布
   * GET /api/dashboard/type_distribution/
   * 注意：后端暂未实现此端点，调用会返回 404
   */
  getAssetTypeDistribution: (): Promise<
    Array<{
      type_name: string
      count: number
      percentage: number
    }>
  > => {
    if (import.meta.env.PROD) {
      console.warn('[dashboardAPI] getAssetTypeDistribution: 后端暂未实现此端点')
      return Promise.resolve([])
    }
    return unwrapResponse(
      request.get<
        Array<{
          type_name: string
          count: number
          percentage: number
        }>
      >('/dashboard/type_distribution/'),
    )
  },

  /**
   * 获取即将到期的资产
   * GET /api/dashboard/expiring_assets/
   * 注意：后端暂未实现此端点，调用会返回 404
   */
  getExpiringAssets: async (days?: number): Promise<ExpiringAsset[]> => {
    if (import.meta.env.PROD) {
      console.warn('[dashboardAPI] getExpiringAssets: 后端暂未实现此端点')
      return []
    }
    return unwrapResponse(
      request.get<ExpiringAsset[]>('/dashboard/expiring_assets/', { days: days || 30 }),
    )
  },

  /**
   * 获取维护提醒
   * GET /api/dashboard/maintenance_reminders/
   * 注意：后端暂未实现此端点，调用会返回 404
   */
  getMaintenanceReminders: (): Promise<MaintenanceReminder[]> => {
    if (import.meta.env.PROD) {
      console.warn('[dashboardAPI] getMaintenanceReminders: 后端暂未实现此端点')
      return Promise.resolve([])
    }
    return unwrapResponse(request.get<MaintenanceReminder[]>('/dashboard/maintenance_reminders/'))
  },
}
