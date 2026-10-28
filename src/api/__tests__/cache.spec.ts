import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryCache } from '@/api/cache'

const { mockRequest, mockUnwrapResponse, mockClearCacheByPattern } = vi.hoisted(() => ({
  mockRequest: {
    get: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    post: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    put: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    patch: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
    delete: vi.fn().mockResolvedValue({ code: 0, data: {}, message: '' }),
  },
  mockUnwrapResponse: vi.fn(
    async (promise: Promise<{ code: number; data: unknown; message: string }>) => {
      const res = await promise
      if (res.code !== 0) throw new Error(res.message || '请求失败')
      return res.data
    },
  ),
  mockClearCacheByPattern: vi.fn(),
}))

vi.mock('@/api/index', () => ({
  request: mockRequest,
  unwrapResponse: mockUnwrapResponse,
  clearCacheByPattern: mockClearCacheByPattern,
}))

import { invalidateAssetCache } from '@/api/assetCache'
import { repairAssetAPI } from '@/api/repairAsset'
import { damagedAssetAPI } from '@/api/damagedAsset'

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => {
    vi.useFakeTimers()
    cache = new MemoryCache(5)
  })

  it('stores and retrieves a value', () => {
    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')
  })

  it('returns undefined for missing key', () => {
    expect(cache.get('nonexistent')).toBeUndefined()
  })

  it('returns undefined for expired entry', () => {
    cache.set('key1', 'value1', 1000)
    vi.advanceTimersByTime(1001)
    expect(cache.get('key1')).toBeUndefined()
  })

  it('clears all entries', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.clear()
    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBeUndefined()
  })

  it('clears expired entries', () => {
    cache.set('key1', 'value1', 1000)
    cache.set('key2', 'value2', 5000)
    vi.advanceTimersByTime(1500)
    cache.clearExpired()
    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBe('value2')
  })

  it('clears by URL pattern', () => {
    cache.set('/assets/assets/?page=1', 'data1')
    cache.set('/assets/contracts/?page=1', 'data2')
    cache.set('/assets/assets/?page=2', 'data3')
    cache.clearByPattern('/assets/assets/')
    expect(cache.get('/assets/assets/?page=1')).toBeUndefined()
    expect(cache.get('/assets/assets/?page=2')).toBeUndefined()
    expect(cache.get('/assets/contracts/?page=1')).toBe('data2')
  })

  it('pattern "/assets/assets/?" hits only list keys, not detail/statistics (AUD-47 三点式)', () => {
    cache.set('/assets/assets/?page=1', 'list1')
    cache.set('/assets/assets/?page=2', 'list2')
    cache.set('/assets/assets/A999/', 'other-detail')
    cache.set('/assets/assets/statistics/?page=1', 'stats')
    cache.clearByPattern('/assets/assets/?')
    // ① 列表 key 全被清
    expect(cache.get('/assets/assets/?page=1')).toBeUndefined()
    expect(cache.get('/assets/assets/?page=2')).toBeUndefined()
    // ② 他资产详情 key 保留 (不误清)
    expect(cache.get('/assets/assets/A999/')).toBe('other-detail')
    // ③ statistics 等聚合端点 key 保留 (不放大 AUD-55 过宽面)
    expect(cache.get('/assets/assets/statistics/?page=1')).toBe('stats')
  })

  it('evicts oldest entry when maxSize is reached', () => {
    const smallCache = new MemoryCache(2)
    smallCache.set('a', 1)
    smallCache.set('b', 2)
    smallCache.set('c', 3) // should evict 'a'
    expect(smallCache.get('a')).toBeUndefined()
    expect(smallCache.get('b')).toBe(2)
    expect(smallCache.get('c')).toBe(3)
  })

  it('uses default TTL of 5 minutes', () => {
    cache.set('key1', 'value1')
    vi.advanceTimersByTime(299_999)
    expect(cache.get('key1')).toBe('value1')
    vi.advanceTimersByTime(1)
    expect(cache.get('key1')).toBeUndefined()
  })
})

describe('M-RC-08 状态写后失效', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('repair 成功后精确失效详情+列表 key（getAssetByCode 二次调用打网）', async () => {
    await repairAssetAPI.repairAsset('RC-1', {} as never)
    expect(mockClearCacheByPattern).toHaveBeenCalledWith('/assets/assets/RC-1/')
    expect(mockClearCacheByPattern).toHaveBeenCalledWith('/assets/assets/?')
  })

  it('表单 asset_recordcode 为空 → 降级宽失效，不得静默跳过（damaged 可选字段常态）', async () => {
    await damagedAssetAPI.createDamagedAsset({
      asset_recordcode: null,
      damaged_asset_number: 1,
    } as never)
    expect(mockClearCacheByPattern).toHaveBeenCalledWith('/assets/assets/')
    expect(mockClearCacheByPattern).not.toHaveBeenCalledWith('/assets/assets/RC-1/')
  })

  it('invalidateAssetCache 空值（undefined/空串/null）均走宽失效', () => {
    invalidateAssetCache(undefined)
    invalidateAssetCache('')
    invalidateAssetCache(null)
    expect(mockClearCacheByPattern).toHaveBeenCalledTimes(3)
    expect(mockClearCacheByPattern).toHaveBeenNthCalledWith(1, '/assets/assets/')
    expect(mockClearCacheByPattern).toHaveBeenNthCalledWith(2, '/assets/assets/')
    expect(mockClearCacheByPattern).toHaveBeenNthCalledWith(3, '/assets/assets/')
  })

  it('打网语义（MemoryCache 模式实证）：repair 精确两 pattern 联合清空详情与列表 key', () => {
    const c = new MemoryCache()
    c.set('/assets/assets/RC-1/?', 'detail-old')
    c.set('/assets/assets/?page=1', 'list-old')
    c.set('/assets/assets/RC-2/?', 'other-detail')
    c.clearByPattern('/assets/assets/RC-1/')
    c.clearByPattern('/assets/assets/?')
    // 详情 key 被清 → 二次 getAssetByCode cache miss 打网
    expect(c.get('/assets/assets/RC-1/?')).toBeUndefined()
    // 列表 key 被清
    expect(c.get('/assets/assets/?page=1')).toBeUndefined()
    // 他资产详情不误伤
    expect(c.get('/assets/assets/RC-2/?')).toBe('other-detail')
  })
})
