/**
 * @file 仪表盘数据模型定义，包括概览、记录、趋势等类型
 * @module types/dashboard
 * @exports
 *   - DashboardOverview: 仪表盘概览数据接口
 *   - OutAssetRecord: 发放记录项接口
 *   - RecycleAssetRecord: 回收记录项接口
 *   - AssetTrendData: 资产趋势数据项接口
 *   - ExpiringAsset: 即将到期的资产项接口
 *   - MaintenanceReminder: 维护提醒项接口
 * @callers
 *   - stores/dashboard（仪表盘状态管理）
 *   - api/dashboard（仪表盘API）
 *   - components/*（组件）
 */

/** 仪表盘概览数据 */
export interface DashboardOverview {
  total_assets: number
  total_value: number // [新增] 资产总价值（后端已有，补全类型）
  total_contracts: number // [新增] 合同总数（后端已有，补全类型）
  active_assets: number
  in_stock_assets: number
  monthly_distributed: number
  monthly_recycled: number
  pending_waste: number
  wasted_assets: number
  total_recycled: number
  total_distributed: number
  /** [新增] 全部 8 种资产状态分布，key 为状态码，value 为 {name, count} */
  status_distribution: Record<string, StatusDistributionItem>
  timestamp: string
}

/** 发放记录项 */
export interface OutAssetRecord {
  id: number
  asset_name: string
  asset_code: string
  distribute_time: string
  recipient_name: string
  department_name: string
}

/** 回收记录项 */
export interface RecycleAssetRecord {
  id: number
  asset_name: string
  asset_code: string
  recycle_time: string
  returner_name: string
  department_name: string
}

/** 资产趋势数据项 */
export interface AssetTrendData {
  date: string
  new_assets: number
  distributed: number
  recovered: number
  scrapped: number
}

/** 即将到期的资产项 */
export interface ExpiringAsset {
  id: number
  asset_name: string
  asset_code: string
  expire_date: string
  days_until_expire: number
}

/** 维护提醒项 */
export interface MaintenanceReminder {
  id: number
  asset_name: string
  asset_code: string
  maintenance_date: string
  type: string
}

/** 状态分布项 */
export interface StatusDistributionItem {
  name: string
  count: number
}
