/**
 * @file 统一状态映射工具，提供各类业务状态的标签、类型与颜色映射
 * @module src/utils/statusMapping
 * @exports
 *   - ASSET_STATUS_MAP: 资产状态映射表
 *   - OUTASSET_STATUS_MAP: 出库状态映射表
 *   - APPROVAL_STATUS_MAP: 审批状态映射表
 *   - REPAIR_STATUS_MAP: 维修状态映射表
 *   - HARD_DISK_STATUS_MAP: 硬盘状态映射表
 *   - EMPLOYEE_STATUS_MAP: 员工状态映射表
 *   - ASSET_TYPE_MAP: 资产分类映射表
 *   - STATUS_COLOR_MAP: 状态颜色 hex 映射表
 *   - getStatusInfo: 通用状态映射获取函数
 *   - getAssetStatusText / getAssetStatusTagType: 资产状态文本与标签类型
 *   - getApprovalStatusText / getApprovalStatusTagType: 审批状态文本与标签类型
 *   - getRepairStatusText / getRepairStatusTagType: 维修状态文本与标签类型
 *   - getHardDiskStatusText / getHardDiskStatusTagType: 硬盘状态文本与标签类型
 *   - getOutAssetStatusText / getOutAssetStatusTagType: 出库状态文本与标签类型
 *   - getEmployeeStatusText / getEmployeeStatusTagType: 员工状态文本与标签类型
 *   - getStatusColor: 获取状态对应的 hex 颜色值
 * @callers
 *   - stores/dashboard
 *   - components/commoncomponents/StatusTag.vue
 * @dependsOn
 *   - 无外部依赖
 */

// ===== 资产状态映射 =====
export const ASSET_STATUS_MAP: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
> = {
  in_store: { label: '在库', type: 'success' },
  in_use: { label: '在用', type: 'primary' },
  recycled_pending: { label: '已回收待发放', type: 'info' },
  broken: { label: '已损坏', type: 'danger' },
  repairing: { label: '维修中', type: 'warning' },
  lost: { label: '已遗失', type: 'danger' },
  damaged: { label: '待报废', type: 'warning' },
  scrapped: { label: '已报废', type: 'info' },
}

// ===== 出库状态映射（出库资产的当前状态，对齐 OutAssetCurrentStatus 枚举） =====
export const OUTASSET_STATUS_MAP: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
> = {
  in_use: { label: '在用', type: 'primary' },
  recycled_pending: { label: '已回收待发放', type: 'info' },
  damaged: { label: '待报废', type: 'warning' },
  scrapped: { label: '已报废', type: 'info' },
}

// ===== 审批状态映射 =====
export const APPROVAL_STATUS_MAP: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
> = {
  pending: { label: '待审批', type: 'warning' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已拒绝', type: 'danger' },
}

// ===== 维修状态映射（对齐 RepairAsset.RepairStatus 枚举） =====
export const REPAIR_STATUS_MAP: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
> = {
  in_progress: { label: '维修中', type: 'warning' },
  completed: { label: '已完成', type: 'success' },
  failed: { label: '维修失败', type: 'danger' },
}

// ===== 硬盘状态映射（对齐 HardDiskStatus 枚举） =====
export const HARD_DISK_STATUS_MAP: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
> = {
  active: { label: '正常', type: 'success' },
  repair: { label: '维修中', type: 'warning' },
  scrap: { label: '已报废', type: 'danger' },
  lost: { label: '已遗失', type: 'danger' },
  damaged: { label: '已损坏', type: 'danger' },
}

// ===== 员工状态映射 =====
export const EMPLOYEE_STATUS_MAP: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
> = {
  active: { label: '在职', type: 'success' },
  left: { label: '离职', type: 'warning' },
  retirement: { label: '退休', type: 'info' },
}

// ===== 资产分类映射 =====
export const ASSET_TYPE_MAP: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
> = {
  electronic: { label: '电子设备', type: 'primary' },
  furniture: { label: '办公家具', type: 'success' },
  vehicle: { label: '交通工具', type: 'warning' },
  other: { label: '其他', type: 'info' },
}

/**
 * 通用状态映射获取函数
 * @param status 状态值
 * @param map 状态映射表
 * @returns { label, type } 或默认值
 */
export function getStatusInfo(
  status: string,
  map: Record<string, { label: string; type: string }>,
): { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' } {
  const info = map[status]
  if (info) {
    return {
      label: info.label,
      type: info.type as 'success' | 'warning' | 'danger' | 'info' | 'primary',
    }
  }
  return { label: status || '未知', type: 'info' }
}

/** 获取资产状态标签类型 */
export function getAssetStatusTagType(status: string) {
  return getStatusInfo(status, ASSET_STATUS_MAP).type
}

/** 获取资产状态文本 */
export function getAssetStatusText(status: string) {
  return getStatusInfo(status, ASSET_STATUS_MAP).label
}

/** 获取审批状态标签类型 */
export function getApprovalStatusTagType(status: string) {
  return getStatusInfo(status, APPROVAL_STATUS_MAP).type
}

/** 获取审批状态文本 */
export function getApprovalStatusText(status: string) {
  return getStatusInfo(status, APPROVAL_STATUS_MAP).label
}

/** 获取维修状态标签类型 */
export function getRepairStatusTagType(status: string) {
  return getStatusInfo(status, REPAIR_STATUS_MAP).type
}

/** 获取维修状态文本 */
export function getRepairStatusText(status: string) {
  return getStatusInfo(status, REPAIR_STATUS_MAP).label
}

/** 获取硬盘状态标签类型 */
export function getHardDiskStatusTagType(status: string) {
  return getStatusInfo(status, HARD_DISK_STATUS_MAP).type
}

/** 获取硬盘状态文本 */
export function getHardDiskStatusText(status: string) {
  return getStatusInfo(status, HARD_DISK_STATUS_MAP).label
}

/** 获取出库状态标签类型 */
export function getOutAssetStatusTagType(status: string) {
  return getStatusInfo(status, OUTASSET_STATUS_MAP).type
}

/** 获取出库状态文本 */
export function getOutAssetStatusText(status: string) {
  return getStatusInfo(status, OUTASSET_STATUS_MAP).label
}

/** 获取员工状态标签类型 */
export function getEmployeeStatusTagType(status: string) {
  return getStatusInfo(status, EMPLOYEE_STATUS_MAP).type
}

/** 获取员工状态文本 */
export function getEmployeeStatusText(status: string) {
  return getStatusInfo(status, EMPLOYEE_STATUS_MAP).label
}

// ===== 状态颜色映射（用于图表等需要 hex 值的场景） =====
// F1: 主色 #2B5FD7, F2: 成功 #52C41A, 警告 #FAAD14, 危险 #FF4D4F
export const STATUS_COLOR_MAP: Record<string, string> = {
  success: '#52C41A',
  primary: '#2B5FD7',
  warning: '#FAAD14',
  danger: '#FF4D4F',
  info: '#909399',
}

/** 获取状态对应的 hex 颜色值 */
export function getStatusColor(status: string): string {
  const info = getStatusInfo(status, ASSET_STATUS_MAP)
  return STATUS_COLOR_MAP[info.type] || STATUS_COLOR_MAP.info
}

/**
 * [新增] 资产状态 → 图表颜色映射
 * 从 ASSET_STATUS_MAP + STATUS_COLOR_MAP 推导，确保与标签颜色语义一致。
 * 用于 ECharts 环形图扇区着色，避免在 Store/组件中重复定义颜色值（DR-4）。
 */
export const ASSET_STATUS_CHART_COLORS: Record<string, string> = {
  in_store: STATUS_COLOR_MAP.success, // 在库 → 绿色
  in_use: STATUS_COLOR_MAP.primary, // 在用 → 蓝色
  recycled_pending: '#13C2C2', // 已回收待发放 → 青色
  broken: STATUS_COLOR_MAP.danger, // 已损坏 → 红色
  repairing: STATUS_COLOR_MAP.warning, // 维修中 → 橙色
  lost: '#F759AB', // 已遗失 → 品红
  damaged: '#FA8C16', // 待报废 → 深橙
  scrapped: STATUS_COLOR_MAP.info, // 已报废 → 灰色
}
