import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetDetail } from '@/types/asset'
import { useAssetDetailHandoff } from '../useAssetDetailHandoff'

/** 交接条目只依赖 recordcode，其余字段用最小桩（类型断言） */
const makeDetail = (recordcode: string, assetName = '测试资产'): AssetDetail =>
  ({ recordcode, asset_name: assetName, harddisk_sns: [] }) as unknown as AssetDetail

const TTL_MS = 10_000

describe('useAssetDetailHandoff', () => {
  const { seed, consume, clear } = useAssetDetailHandoff()

  beforeEach(() => {
    clear()
    vi.useRealTimers()
  })

  it('seed → consume 命中且一次性消费', () => {
    const detail = makeDetail('RC-001')
    seed(detail)

    expect(consume('RC-001')).toBe(detail)
    expect(consume('RC-001')).toBeNull()
  })

  it('seed 无 recordcode 时静默丢弃', () => {
    seed(makeDetail(''))
    expect(consume('')).toBeNull()
    expect(clear).toBeTypeOf('function')
  })

  it('consume 无 code 时返回 null', () => {
    seed(makeDetail('RC-002'))
    expect(consume()).toBeNull()
    expect(consume('RC-002')).not.toBeNull()
  })

  it('TTL 边界：10s 内命中、超过 10s 返回 null 且条目被删除', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    seed(makeDetail('RC-003'))
    seed(makeDetail('RC-004'))

    vi.setSystemTime(now + TTL_MS)
    expect(consume('RC-003')).not.toBeNull()
    expect(consume('RC-004')).not.toBeNull()

    seed(makeDetail('RC-005'))
    vi.setSystemTime(now + TTL_MS + TTL_MS + 1)
    expect(consume('RC-005')).toBeNull()
    expect(consume('RC-005')).toBeNull()
  })

  it('miss 回退：未 seed 的 code 返回 null', () => {
    expect(consume('RC-NOT-SEEDED')).toBeNull()
  })

  it('clear(code) 仅清指定条目', () => {
    seed(makeDetail('RC-005'))
    seed(makeDetail('RC-006'))
    clear('RC-005')

    expect(consume('RC-005')).toBeNull()
    expect(consume('RC-006')).not.toBeNull()
  })

  it('clear() 清全部条目', () => {
    seed(makeDetail('RC-007'))
    seed(makeDetail('RC-008'))
    clear()

    expect(consume('RC-007')).toBeNull()
    expect(consume('RC-008')).toBeNull()
  })

  it('多次 seed 同一 code 以最后一次为准', () => {
    const first = makeDetail('RC-009', '旧')
    const second = makeDetail('RC-009', '新')
    seed(first)
    seed(second)

    expect(consume('RC-009')).toBe(second)
  })
})
