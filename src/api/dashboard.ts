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
  DepartmentDistributionItem,
  AssetTypeDistributionItem,
} from '@/types/dashboard'

export type {
  DashboardOverview,
  OutAssetRecord,
  RecycleAssetRecord,
  AssetTrendData,
  ExpiringAsset,
  MaintenanceReminder,
  DepartmentDistributionItem,
  AssetTypeDistributionItem,
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
   * @param params 可选 start_date/end_date (YYYY-MM-DD)，不传时回退到最近30天
   */
  getAssetTrend: async (params?: {
    start_date?: string
    end_date?: string
  }): Promise<AssetTrendData[]> => {
    return unwrapResponse(request.get<AssetTrendData[]>('/dashboard/trend/', params))
  },

  /**
   * 获取部门资产分布
   * GET /api/dashboard/department_distribution/
   */
  getDepartmentDistribution: async (): Promise<DepartmentDistributionItem[]> => {
    return unwrapResponse(
      request.get<DepartmentDistributionItem[]>('/dashboard/department_distribution/'),
    )
  },

  /**
   * 获取资产类型分布
   * GET /api/dashboard/type_distribution/
   */
  getAssetTypeDistribution: async (): Promise<AssetTypeDistributionItem[]> => {
    return unwrapResponse(request.get<AssetTypeDistributionItem[]>('/dashboard/type_distribution/'))
  },

  /**
   * 获取即将到期的资产
   * GET /api/dashboard/expiring_assets/
   * @param days 查询天数范围，默认30天
   */
  getExpiringAssets: async (days?: number): Promise<ExpiringAsset[]> => {
    return unwrapResponse(
      request.get<ExpiringAsset[]>('/dashboard/expiring_assets/', { days: days || 30 }),
    )
  },

  /**
   * 获取维护提醒
   * GET /api/dashboard/maintenance_reminders/
   */
  getMaintenanceReminders: async (): Promise<MaintenanceReminder[]> => {
    return unwrapResponse(request.get<MaintenanceReminder[]>('/dashboard/maintenance_reminders/'))
  },
}
