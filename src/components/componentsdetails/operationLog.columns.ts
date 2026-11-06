/**
 * 操作日志表格列配置（自 OperationLogDetails.vue 物理提取）
 *
 * [BF-182 / M-22-F14-A] IP 列仅系统管理员可见（2026-11-06 拍板 A，与后端
 * AssetOperationLogSerializer 运行时剔除同口径）：基础列集不含 IP，
 * 系统管理员经 getOperationLogColumns 追加。
 */
import type { TableColumn } from '@/types/list'

/**
 * 表格列定义（基础集，8 列，不含 IP）
 * 每一列的渲染方式、标题、宽度等属性
 */
export const operationLogColumns: TableColumn[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  {
    type: 'custom',
    prop: 'operation_type',
    label: '操作类型',
    width: 110,
    align: 'center',
    slotName: 'operation_type',
  },
  { prop: 'asset_code', label: '资产编码', width: 150, align: 'center' },
  { prop: 'asset_name', label: '资产名称', width: 150, align: 'left' },
  { prop: 'asset_specification', label: '资产规格', width: 150, align: 'left' },
  { prop: 'operator_name', label: '操作人', width: 100, align: 'center' },
  {
    type: 'custom',
    prop: 'operation_time',
    label: '操作时间',
    width: 170,
    align: 'center',
    slotName: 'operation_time',
  },
  { prop: 'description', label: '描述', width: 200, align: 'left' },
]

/** IP 列（仅系统管理员可见） */
export const operationLogIpColumn: TableColumn = {
  prop: 'ip_address',
  label: 'IP地址',
  width: 130,
  align: 'center',
}

/**
 * 按角色取操作日志列集（DR-1：列集组装唯一入口）
 * @param isAdmin 是否系统管理员（usePermission().isAdmin，与后端 is_system_admin 对称）
 */
export function getOperationLogColumns(isAdmin: boolean): TableColumn[] {
  return isAdmin ? [...operationLogColumns, operationLogIpColumn] : [...operationLogColumns]
}
