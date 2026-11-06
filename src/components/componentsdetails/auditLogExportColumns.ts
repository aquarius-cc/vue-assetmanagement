/**
 * @file 审计日志列表页导出列配置（自 AuditLogDetails.vue 提取，便于单测覆盖）
 * @module components/componentsdetails/auditLogExportColumns
 * @exports
 *   - auditLogExportColumns: 审计日志导出列全集（8 列含 IP，与后端逐列对应）
 *   - getAuditLogExportColumns: 按角色取导出列集（IP 列仅系统管理员）
 * @callers
 *   - components/componentsdetails/AuditLogDetails.vue
 * @dependsOn
 *   - types/auditlog (AuditLog)
 *   - utils/excelExporter (ColumnConfig)
 */
import type { AuditLog } from '@/types/auditlog'
import type { ColumnConfig } from '@/utils/excelExporter'

/** 审计日志导出列全集（含 IP 列；与后端 AuditLogExportView.export_columns 逐列对应） */
export const auditLogExportColumns: ColumnConfig<AuditLog>[] = [
  { title: '应用模块', key: 'app_label', default: '' },
  { title: '操作类型', key: 'operation_type', default: '' },
  { title: '记录编码', key: 'record_code', default: '' },
  { title: '操作描述', key: 'description', default: '' },
  { title: '操作人工号', key: 'operator_jobcode', default: '' },
  { title: '操作人', key: 'operator_name', default: '' },
  { title: '操作时间', key: 'operation_time', default: '' },
  { title: 'IP地址', key: 'ip_address', default: '' },
]

/**
 * [BF-182 / M-22-F14-A] 按角色取审计日志导出列集：IP 列仅系统管理员可见（拍板 A）。
 * 与后端 AuditLogExportView 动态剔列双保险（客户端导出取当前页行数据，非管理员
 * 行数据本身已无 IP 字段，此处剔除的是空列展示）。
 */
export function getAuditLogExportColumns(isAdmin: boolean): ColumnConfig<AuditLog>[] {
  return isAdmin
    ? [...auditLogExportColumns]
    : auditLogExportColumns.filter((c) => c.key !== 'ip_address')
}
