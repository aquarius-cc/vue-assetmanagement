/**
 * 操作日志详情页导出列配置 [BF-182 / M-22-F14-A]
 * IP 列仅系统管理员可见（拍板 A），与后端序列化器运行时剔除双保险。
 */
import { describe, it, expect } from 'vitest'
import type { OperationLog } from '@/types/operationlog'
import {
  operationLogDetailExportColumns,
  getOperationLogDetailExportColumns,
} from '../operationLogDetailExport'

const ALL_TITLES = [
  'ID',
  '日志ID',
  '资产编码',
  '资产名称',
  '操作类型',
  '操作人',
  '操作人工号',
  '操作时间',
  '描述',
  'IP地址',
]

describe('operationLogDetailExportColumns [BF-182]', () => {
  it('全集 10 列（顺序与组件原内联清单一致）', () => {
    expect(operationLogDetailExportColumns.map((c) => c.title)).toEqual(ALL_TITLES)
  })

  it('系统管理员 = 全集 10 列（含 IP地址）', () => {
    expect(getOperationLogDetailExportColumns(true).map((c) => c.title)).toEqual(ALL_TITLES)
  })

  it('非系统管理员 = 9 列（IP地址 剔除，顺序不变）', () => {
    expect(getOperationLogDetailExportColumns(false).map((c) => c.title)).toEqual(
      ALL_TITLES.slice(0, 9),
    )
  })

  it('【A-3】操作时间 formatter 保持秒级精度（formatDateTimeFull）', () => {
    const row = {} as unknown as OperationLog
    const col = operationLogDetailExportColumns.find((c) => c.title === '操作时间')
    expect(col?.formatter?.('2026-11-06 12:00:05', row, [row])).toBe('2026-11-06 12:00:05')
  })

  it('操作类型 formatter 空值回退「未知」', () => {
    const row = {} as unknown as OperationLog
    const col = operationLogDetailExportColumns.find((c) => c.title === '操作类型')
    expect(col?.formatter?.(null, row, [row])).toBe('未知')
  })
})
