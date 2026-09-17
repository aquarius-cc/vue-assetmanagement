import { describe, it, expect } from 'vitest'
import type { UnregisteredAsset } from '@/types/unregisteredasset'
import {
  getScenarioTypeText,
  getScenarioTypeTagType,
  getHandleTypeText,
  unregisteredAssetExportColumns,
} from '../unregisteredAssetDetailExport'

const emptyRow = {} as UnregisteredAsset

describe('getScenarioTypeText', () => {
  it('已知场景类型返回中文文本', () => {
    expect(getScenarioTypeText('s1_no_record')).toBe('无记录资产')
    expect(getScenarioTypeText('s2_no_outasset')).toBe('无出库记录')
  })

  it('未知场景类型返回未知', () => {
    expect(getScenarioTypeText('bogus')).toBe('未知')
  })

  it('空值返回未知', () => {
    expect(getScenarioTypeText('')).toBe('未知')
    expect(getScenarioTypeText(null)).toBe('未知')
    expect(getScenarioTypeText(undefined)).toBe('未知')
  })
})

describe('getScenarioTypeTagType', () => {
  it('已知场景类型返回标签类型', () => {
    expect(getScenarioTypeTagType('s1_no_record')).toBe('danger')
    expect(getScenarioTypeTagType('s2_no_outasset')).toBe('warning')
    expect(getScenarioTypeTagType('s3_status_mismatch')).toBe('info')
  })

  it('未知场景类型回退 info', () => {
    expect(getScenarioTypeTagType('bogus')).toBe('info')
  })

  it('空值回退 info', () => {
    expect(getScenarioTypeTagType('')).toBe('info')
    expect(getScenarioTypeTagType(null)).toBe('info')
  })
})

describe('getHandleTypeText', () => {
  it('已知处理类型返回中文文本', () => {
    expect(getHandleTypeText('create_and_recycle')).toBe('新建并回收')
    expect(getHandleTypeText('reject')).toBe('驳回')
  })

  it('未知处理类型返回原始值', () => {
    expect(getHandleTypeText('bogus')).toBe('bogus')
  })

  it('空值返回未处理', () => {
    expect(getHandleTypeText('')).toBe('未处理')
    expect(getHandleTypeText(null)).toBe('未处理')
    expect(getHandleTypeText(undefined)).toBe('未处理')
  })
})

describe('unregisteredAssetExportColumns', () => {
  it('定义完整的列配置', () => {
    expect(unregisteredAssetExportColumns).toHaveLength(20)
    expect(unregisteredAssetExportColumns[0]).toMatchObject({
      title: 'ID',
      key: 'id',
      default: '',
    })
  })

  it('场景类型列使用 getScenarioTypeText 格式化', () => {
    const col = unregisteredAssetExportColumns.find((c) => c.key === 'scenario_type')
    expect(col?.formatter?.('s1_no_record', emptyRow)).toBe('无记录资产')
    expect(col?.formatter?.('bogus', emptyRow)).toBe('未知')
  })

  it('发现日期列格式化有效与无效值', () => {
    const col = unregisteredAssetExportColumns.find((c) => c.key === 'discovery_date')
    expect(col?.formatter?.(new Date(2025, 0, 15), emptyRow)).toBe('2025-01-15')
    expect(col?.formatter?.('not-a-date', emptyRow)).toBe('')
    expect(col?.formatter?.(undefined, emptyRow)).toBe('')
  })

  it('关联资产编码列格式化对象与字符串', () => {
    const col = unregisteredAssetExportColumns.find((c) => c.key === 'related_asset')
    expect(col?.formatter?.({ code: 'A-001' }, emptyRow)).toBe('A-001')
    expect(col?.formatter?.({}, emptyRow)).toBe('')
    expect(col?.formatter?.('A-001', emptyRow)).toBe('A-001')
    expect(col?.formatter?.(null, emptyRow)).toBe('')
    expect(col?.formatter?.(undefined, emptyRow)).toBe('')
  })

  it('审批状态列格式化已知与未知状态', () => {
    const col = unregisteredAssetExportColumns.find((c) => c.key === 'approval_status')
    expect(col?.formatter?.('pending', emptyRow)).toBe('待审批')
    expect(col?.formatter?.(undefined, emptyRow)).toBe('未知')
  })

  it('审批人列格式化对象与字符串', () => {
    const col = unregisteredAssetExportColumns.find((c) => c.key === 'approver')
    expect(col?.formatter?.({ name: '张三' }, emptyRow)).toBe('张三')
    expect(col?.formatter?.({}, emptyRow)).toBe('')
    expect(col?.formatter?.('张三', emptyRow)).toBe('张三')
    expect(col?.formatter?.(null, emptyRow)).toBe('')
    expect(col?.formatter?.(undefined, emptyRow)).toBe('')
  })

  it('处理类型列使用 getHandleTypeText 格式化', () => {
    const col = unregisteredAssetExportColumns.find((c) => c.key === 'handle_type')
    expect(col?.formatter?.('create_and_damaged', emptyRow)).toBe('新建并报废')
    expect(col?.formatter?.('bogus', emptyRow)).toBe('bogus')
  })

  it('时间列格式化有效与无效值', () => {
    const createdCol = unregisteredAssetExportColumns.find((c) => c.key === 'created_at')
    const updatedCol = unregisteredAssetExportColumns.find((c) => c.key === 'updated_at')
    const approvalDateCol = unregisteredAssetExportColumns.find((c) => c.key === 'approval_date')
    expect(createdCol?.formatter?.(new Date(2025, 6, 3), emptyRow)).toBe('2025-07-03')
    expect(createdCol?.formatter?.('invalid', emptyRow)).toBe('')
    expect(updatedCol?.formatter?.(new Date(2025, 1, 10), emptyRow)).toBe('2025-02-10')
    expect(updatedCol?.formatter?.('invalid', emptyRow)).toBe('')
    expect(approvalDateCol?.formatter?.(undefined, emptyRow)).toBe('')
  })

  it('无格式化器的列直接输出', () => {
    const idCol = unregisteredAssetExportColumns.find((c) => c.key === 'id')
    expect(idCol?.formatter).toBeUndefined()
  })
})
