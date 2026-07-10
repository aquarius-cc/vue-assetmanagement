/**
 * 仪表盘 API
 * 对应后端接口: /api/dashboard/
 * 所有字段名采用 snake_case 与后端序列化器保持一致
 */
import { request, unwrapResponse } from '@/api/index'

// [MR-10] DashboardStats 接口已删除 — /dashboard/stats/ 端点废弃，统一使用 /dashboard/overview/

// 仪表盘概览数据
export interface DashboardOverview {
  // 资产统计
  total_assets: number
  active_assets: number
  in_stock_assets: number

  // 本月统计
  monthly_distributed: number
  monthly_recycled: number

  // 报废统计
  pending_waste: number
  wasted_assets: number

  // 回收统计
  total_recycled: number

  // 发放统计
  total_distributed: number

  // 时间戳
  timestamp: string
}

// 发放记录项
export interface OutAssetRecord {
  id: number
  asset_name: string
  asset_code: string
  distribute_time: string
  recipient_name: string
  department_name: string
}

// 回收记录项
export interface RecycleAssetRecord {
  id: number
  asset_name: string
  asset_code: string
  recycle_time: string
  returner_name: string
  department_name: string
}

// 资产趋势数据
export interface AssetTrendData {
  date: string
  new_assets: number
  distributed: number
  recovered: number
  scrapped: number
}

// 即将到期的资产项
export interface ExpiringAsset {
  id: number
  asset_name: string
  asset_code: string
  expire_date: string
  days_until_expire: number
}

// 维护提醒项
export interface MaintenanceReminder {
  id: number
  asset_name: string
  asset_code: string
  maintenance_date: string
  type: string
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
    return unwrapResponse(request.get<OutAssetRecord[]>('/dashboard/recent_out_assets/', { limit: limit || 10 }))
  },

  /**
   * 获取最近回收记录
   * @param limit 记录数量限制
   * @returns 回收记录列表
   */
  getRecentRecycleAssets: async (limit?: number): Promise<RecycleAssetRecord[]> => {
    return unwrapResponse(request.get<RecycleAssetRecord[]>('/dashboard/recent_recycle_assets/', { limit: limit || 10 }))
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
    return unwrapResponse(request.get<
      Array<{
        department_name: string
        asset_count: number
        percentage: number
      }>
    >('/dashboard/department_distribution/'))
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
    return unwrapResponse(request.get<
      Array<{
        type_name: string
        count: number
        percentage: number
      }>
    >('/dashboard/type_distribution/'))
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
    return unwrapResponse(request.get<ExpiringAsset[]>('/dashboard/expiring_assets/', { days: days || 30 }))
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
