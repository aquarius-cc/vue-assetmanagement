/**
 * 统一状态映射工具
 * 消除 16 个文件中的重复状态映射函数（DR-4 / HIGH-10）
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

// ===== 出库状态映射 =====
export const OUTASSET_STATUS_MAP: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
> = {
  active: { label: '在用', type: 'primary' },
  returned: { label: '已归还', type: 'success' },
  overdue: { label: '逾期', type: 'danger' },
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

// ===== 维修状态映射 =====
export const REPAIR_STATUS_MAP: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
> = {
  repairing: { label: '维修中', type: 'warning' },
  completed: { label: '已完成', type: 'success' },
  failed: { label: '维修失败', type: 'danger' },
}

// ===== 硬盘状态映射 =====
export const HARD_DISK_STATUS_MAP: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
> = {
  normal: { label: '正常', type: 'success' },
  bad_sector: { label: '坏道', type: 'warning' },
  damaged: { label: '损坏', type: 'danger' },
  replaced: { label: '已更换', type: 'info' },
  recycled: { label: '已回收', type: 'info' },
}

// ===== 员工状态映射 =====
export const EMPLOYEE_STATUS_MAP: Record<
  string,
  { label: string; type: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
> = {
  active: { label: '在职', type: 'success' },
  inactive: { label: '离职', type: 'danger' },
  probation: { label: '试用期', type: 'warning' },
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
export const STATUS_COLOR_MAP: Record<string, string> = {
  success: '#52C41A',
  primary: '#409EFF',
  warning: '#E6A23C',
  danger: '#F56C6C',
  info: '#909399',
}

/** 获取状态对应的 hex 颜色值 */
export function getStatusColor(status: string): string {
  const info = getStatusInfo(status, ASSET_STATUS_MAP)
  return STATUS_COLOR_MAP[info.type] || STATUS_COLOR_MAP.info
}
