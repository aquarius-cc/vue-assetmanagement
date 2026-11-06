/**
 * 操作日志表格列配置 [BF-182 / M-22-F14-A]
 * IP 列仅系统管理员可见（拍板 A）：基础列集不含 IP，管理员经 getOperationLogColumns 追加。
 */
import { describe, it, expect } from 'vitest'
import {
  getOperationLogColumns,
  operationLogColumns,
  operationLogIpColumn,
} from '../operationLog.columns'

const BASE_LABELS = [
  '序号',
  '操作类型',
  '资产编码',
  '资产名称',
  '资产规格',
  '操作人',
  '操作时间',
  '描述',
]

describe('operationLog.columns [BF-182]', () => {
  it('基础列集为 8 列且不含 IP 列（顺序不变）', () => {
    expect(operationLogColumns.map((c) => c.label)).toEqual(BASE_LABELS)
  })

  it('IP 列独立导出且口径固定', () => {
    expect(operationLogIpColumn).toEqual({
      prop: 'ip_address',
      label: 'IP地址',
      width: 130,
      align: 'center',
    })
  })

  it('系统管理员列集 = 基础 8 列 + IP 列（IP 殿后）', () => {
    const cols = getOperationLogColumns(true)
    expect(cols).toHaveLength(9)
    expect(cols.map((c) => c.label)).toEqual([...BASE_LABELS, 'IP地址'])
  })

  it('非系统管理员列集 = 基础 8 列（无 IP）', () => {
    const cols = getOperationLogColumns(false)
    expect(cols).toHaveLength(8)
    expect(cols.map((c) => c.label)).not.toContain('IP地址')
  })

  it('返回副本（调用方 mutate 不影响模块单例）', () => {
    const admin = getOperationLogColumns(true)
    admin.push({ label: '注入列' })
    expect(getOperationLogColumns(true)).toHaveLength(9)
    expect(getOperationLogColumns(false)).toHaveLength(8)
  })
})
