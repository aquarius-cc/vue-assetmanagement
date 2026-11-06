/**
 * 审计日志导出列配置 [BF-182 / M-22-F14-A]
 * IP 列仅系统管理员可见（拍板 A），与后端 AuditLogExportView 动态剔列双保险。
 */
import { describe, it, expect } from 'vitest'
import { auditLogExportColumns, getAuditLogExportColumns } from '../auditLogExportColumns'

const ALL_TITLES = [
  '应用模块',
  '操作类型',
  '记录编码',
  '操作描述',
  '操作人工号',
  '操作人',
  '操作时间',
  'IP地址',
]

describe('auditLogExportColumns [BF-182]', () => {
  it('全集 8 列（与后端 AuditLogExportView.export_columns 逐列对应）', () => {
    expect(auditLogExportColumns.map((c) => c.title)).toEqual(ALL_TITLES)
  })

  it('系统管理员 = 全集 8 列（含 IP地址）', () => {
    expect(getAuditLogExportColumns(true).map((c) => c.title)).toEqual(ALL_TITLES)
  })

  it('非系统管理员 = 前 7 列（IP地址 剔除，顺序不变）', () => {
    expect(getAuditLogExportColumns(false).map((c) => c.title)).toEqual(ALL_TITLES.slice(0, 7))
  })
})
