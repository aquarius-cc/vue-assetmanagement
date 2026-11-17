/**
 * 【MA-10】C3-1 failedMap 单源基座单测
 * 覆盖 index 形态（400 items / fail_items）与 id 形态（useBatchImport 管线）
 */
import { describe, expect, it } from 'vitest'

import {
  applyFailedMapToRows,
  buildFailedMapByIndex,
  buildFailedMapFromIds,
  extract400Items,
  isFailItem,
} from '../failedMap'

describe('extract400Items', () => {
  it('400 响应体提取 data.items', () => {
    const err = {
      isAxiosError: true,
      response: { status: 400, data: { code: 400, data: { items: [{ type_code: ['重复'] }] } } },
    }
    expect(extract400Items(err)).toEqual([{ type_code: ['重复'] }])
  })

  it('非 400 返回 null', () => {
    const err = { isAxiosError: true, response: { status: 500, data: {} } }
    expect(extract400Items(err)).toBeNull()
  })

  it('非 AxiosError 返回 null', () => {
    expect(extract400Items(new Error('boom'))).toBeNull()
  })
})

describe('isFailItem / buildFailedMapByIndex', () => {
  it('fail_items 形态：以 item.index 为键', () => {
    expect(isFailItem({ index: 1, error_message: 'x' })).toBe(true)
    const map = buildFailedMapByIndex([
      { index: 0, error_message: '编码重复' },
      { index: 2, error_message: '名称缺失' },
    ])
    expect(map.get(0)).toBe('编码重复')
    expect(map.get(2)).toBe('名称缺失')
    expect(map.size).toBe(2)
  })

  it('400 items 形态：以数组下标为键，字段值展平拼接', () => {
    const map = buildFailedMapByIndex([{ type_code: ['必填'] }, {}, { type_name: ['a', 'b'] }])
    expect(map.get(0)).toBe('必填')
    expect(map.has(1)).toBe(false)
    expect(map.get(2)).toBe('ab')
  })
})

describe('applyFailedMapToRows', () => {
  it('命中行 error + submitError，未命中行 success，fallback 兜底', () => {
    const rows = [{}, {}, {}]
    const map = new Map<number, string>([[1, '']])
    applyFailedMapToRows(rows, map, '提交失败')
    expect(rows[0]).toEqual({ submitStatus: 'success' })
    expect(rows[1]).toEqual({ submitStatus: 'error', submitError: '提交失败' })
    expect(rows[2]).toEqual({ submitStatus: 'success' })
  })
})

describe('buildFailedMapFromIds', () => {
  it('id 形态：以业务 id 字段值回查，null/undefined 跳过', () => {
    const failedItems = [
      { item: { asset_code: 'A001' }, error: '重复' },
      { item: { asset_code: null }, error: '无码' },
    ] as Array<{ item: { asset_code: string | null }; error: string }>
    const map = buildFailedMapFromIds(failedItems, 'asset_code')
    expect(map.get('A001')).toBe('重复')
    expect(map.has('null')).toBe(false)
    expect(map.size).toBe(1)
  })
})
