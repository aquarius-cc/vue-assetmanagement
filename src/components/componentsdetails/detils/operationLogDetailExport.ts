/**
 * @file 操作日志详情页导出列配置（自 OperationLogDetail.vue 提取，便于单测覆盖）
 * @module components/componentsdetails/detils/operationLogDetailExport
 * @exports
 *   - operationLogDetailExportColumns: 详情页导出列全集（10 列含 IP）
 *   - getOperationLogDetailExportColumns: 按角色取导出列集（IP 列仅系统管理员）
 * @callers
 *   - components/componentsdetails/detils/OperationLogDetail.vue
 * @dependsOn
 *   - types/operationlog (OperationLog / operationTypeMapping)
 *   - utils/excelExporter (ColumnConfig)
 *   - utils/Format (formatDateTimeFull)
 */
import type { OperationLog } from '@/types/operationlog'
import { operationTypeMapping } from '@/types/operationlog'
import type { ColumnConfig } from '@/utils/excelExporter'
import { formatDateTimeFull } from '@/utils/Format'

/** 操作类型中文文本（与组件内展示口径一致：空值 → 未知） */
function getOperationTypeText(type: string | null | undefined): string {
  if (!type) return '未知'
  return operationTypeMapping[type] || type
}

/** 操作日志详情页导出列全集（含 IP 列；顺序与组件原内联清单一致） */
export const operationLogDetailExportColumns: ColumnConfig<OperationLog>[] = [
  { title: 'ID', key: 'id', default: '' },
  { title: '日志ID', key: 'logging_id', default: '' },
  { title: '资产编码', key: 'asset_code', default: '' },
  { title: '资产名称', key: 'asset_name', default: '' },
  {
    title: '操作类型',
    key: 'operation_type',
    default: '',
    formatter: (v) => getOperationTypeText(v as string),
  },
  { title: '操作人', key: 'operator_name', default: '' },
  { title: '操作人工号', key: 'operator_jobcode', default: '' },
  {
    title: '操作时间',
    key: 'operation_time',
    default: '',
    // 【A-3】导出与页面展示保持同一秒级精度
    formatter: (v) => formatDateTimeFull(v as string) || '',
  },
  { title: '描述', key: 'description', default: '' },
  { title: 'IP地址', key: 'ip_address', default: '' },
]

/**
 * [BF-182 / M-22-F14-A] 按角色取详情页导出列集：IP 列仅系统管理员可见（拍板 A）。
 * 与后端序列化器运行时剔除双保险。
 */
export function getOperationLogDetailExportColumns(isAdmin: boolean): ColumnConfig<OperationLog>[] {
  return isAdmin
    ? [...operationLogDetailExportColumns]
    : operationLogDetailExportColumns.filter((c) => c.key !== 'ip_address')
}
