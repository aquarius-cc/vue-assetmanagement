/**
 * 子资源缓存失效测试（M-CACHE-1）
 * @module api/assetCache + 7 个子资源 api 模块
 * 复用 cache.spec 的 vi.hoisted + vi.mock('@/api/index') 形态，不另造 scaffold。
 */
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

import { invalidateSubResourceCache } from '@/api/assetCache'
import { brokenAssetAPI } from '@/api/brokenAsset'
import { lostAssetAPI } from '@/api/lostAsset'
import { foundAssetAPI } from '@/api/foundAsset'
import { repairAssetAPI } from '@/api/repairAsset'
import { recycleAssetAPI } from '@/api/recycleAsset'
import { outAssetAPI } from '@/api/outAsset'
import { damagedAssetAPI } from '@/api/damagedAsset'

const batchDeleteResult = (successIds: string[]) => ({
  total: successIds.length,
  success_count: successIds.length,
  fail_count: 0,
  success_ids: successIds,
  fail_items: [],
})

/** 收集本次调用产生的全部 pattern（去重保序） */
function patterns(): string[] {
  return mockClearCacheByPattern.mock.calls.map((c: unknown[]) => c[0] as string)
}

beforeEach(() => {
  mockClearCacheByPattern.mockClear()
  mockRequest.delete.mockResolvedValue({ code: 0, data: {}, message: '' })
  mockRequest.post.mockResolvedValue({ code: 0, data: batchDeleteResult([]), message: '' })
})

describe('invalidateSubResourceCache 内核单元（M-CACHE-1）', () => {
  it('root 归一化：无尾斜杠 / 无首斜杠均产出正确 pattern', () => {
    invalidateSubResourceCache('/assets/lost-assets/', ['RC-1'])
    expect(patterns()).toContain('/assets/lost-assets/RC-1/')
    expect(patterns()).toContain('/assets/lost-assets/?')

    mockClearCacheByPattern.mockClear()
    invalidateSubResourceCache('assets/lost-assets', ['RC-1'])
    expect(patterns()).toContain('/assets/lost-assets/RC-1/')
    expect(patterns()).toContain('/assets/lost-assets/?')
  })

  it('codes=[rc]：详情 pattern 与列表 pattern 各一次', () => {
    invalidateSubResourceCache('/assets/lost-assets/', ['RC-1'])
    expect(patterns().filter((p) => p === '/assets/lost-assets/RC-1/')).toHaveLength(1)
    expect(patterns().filter((p) => p === '/assets/lost-assets/?')).toHaveLength(1)
  })

  it('codes=[]（P0-3）：只清列表 key，不得出现宽失效 root', () => {
    invalidateSubResourceCache('/assets/lost-assets/', [])
    expect(patterns()).toEqual(['/assets/lost-assets/?'])
    expect(patterns()).not.toContain('/assets/lost-assets/')
  })

  it('codes 含空串：过滤，不产生 `${root}/` 自伤 pattern', () => {
    invalidateSubResourceCache('/assets/lost-assets/', ['RC-1', '', 'RC-2'])
    expect(patterns()).toContain('/assets/lost-assets/RC-1/')
    expect(patterns()).toContain('/assets/lost-assets/RC-2/')
    expect(patterns()).not.toContain('/assets/lost-assets//')
  })

  it('codes=null/undefined：单次宽失效 root', () => {
    invalidateSubResourceCache('/assets/lost-assets/', null)
    expect(patterns()).toEqual(['/assets/lost-assets/'])
    invalidateSubResourceCache('/assets/lost-assets/')
    expect(patterns()).toEqual(['/assets/lost-assets/', '/assets/lost-assets/'])
  })
})

describe('单删 ×7 契约（精确 [rc]，接入后转绿）', () => {
  const singleDeleteContract: Array<[string, () => Promise<unknown>, string]> = [
    ['broken', () => brokenAssetAPI.deleteBrokenAsset('RC-B1'), '/assets/broken-assets/RC-B1/'],
    ['lost', () => lostAssetAPI.deleteLostAsset('RC-L1'), '/assets/lost-assets/RC-L1/'],
    ['found', () => foundAssetAPI.deleteFoundAsset('RC-F1'), '/assets/found-assets/RC-F1/'],
    ['repair', () => repairAssetAPI.deleteRepairAsset('RC-R1'), '/assets/repair-assets/RC-R1/'],
    [
      'recycle',
      () => recycleAssetAPI.deleteRecycleAsset('RC-RC1'),
      '/assets/recycle-assets/RC-RC1/',
    ],
    ['out', () => outAssetAPI.deleteOutAsset('RC-O1'), '/assets/out-assets/RC-O1/'],
    ['damaged', () => damagedAssetAPI.deleteDamagedAsset('RC-D1'), '/assets/damaged-assets/RC-D1/'],
  ]

  for (const [name, invoke, detailPattern] of singleDeleteContract) {
    it(`单删 ${name}：精确失效详情 + 列表 key`, async () => {
      await invoke()
      expect(patterns()).toContain(detailPattern)
      const root = detailPattern.slice(
        0,
        detailPattern.lastIndexOf('/', detailPattern.length - 2) + 1,
      )
      expect(patterns()).toContain(`${root}?`)
    })
  }
})

describe('批删 ×7 契约（6 精确 success_ids + damaged 宽，接入后转绿）', () => {
  it('broken 批删：success_ids 精确失效', async () => {
    mockRequest.post.mockResolvedValue({
      code: 0,
      data: batchDeleteResult(['RC-B1', 'RC-B2']),
      message: '',
    })
    await brokenAssetAPI.batchDeleteBrokenAssets(['RC-B1', 'RC-B2', 'RC-B3'])
    expect(patterns()).toContain('/assets/broken-assets/RC-B1/')
    expect(patterns()).toContain('/assets/broken-assets/RC-B2/')
    expect(patterns()).not.toContain('/assets/broken-assets/RC-B3/')
  })

  it('lost 批删：success_ids 精确失效', async () => {
    mockRequest.post.mockResolvedValue({ code: 0, data: batchDeleteResult(['RC-L1']), message: '' })
    await lostAssetAPI.batchDeleteLostAssets(['RC-L1', 'RC-L2'])
    expect(patterns()).toContain('/assets/lost-assets/RC-L1/')
    expect(patterns()).not.toContain('/assets/lost-assets/RC-L2/')
  })

  it('found 批删：success_ids 精确失效', async () => {
    mockRequest.post.mockResolvedValue({ code: 0, data: batchDeleteResult(['RC-F1']), message: '' })
    await foundAssetAPI.batchDeleteFoundAssets(['RC-F1'])
    expect(patterns()).toContain('/assets/found-assets/RC-F1/')
  })

  it('repair 批删：success_ids 精确失效', async () => {
    mockRequest.post.mockResolvedValue({ code: 0, data: batchDeleteResult(['RC-R1']), message: '' })
    await repairAssetAPI.batchDeleteRepairAssets(['RC-R1'])
    expect(patterns()).toContain('/assets/repair-assets/RC-R1/')
  })

  it('recycle 批删：success_ids 精确失效', async () => {
    mockRequest.post.mockResolvedValue({
      code: 0,
      data: batchDeleteResult(['RC-RC1']),
      message: '',
    })
    await recycleAssetAPI.batchDeleteRecycleAssets(['RC-RC1'])
    expect(patterns()).toContain('/assets/recycle-assets/RC-RC1/')
  })

  it('out 批删：success_ids 精确失效', async () => {
    mockRequest.post.mockResolvedValue({ code: 0, data: batchDeleteResult(['RC-O1']), message: '' })
    await outAssetAPI.batchDeleteOutAssets(['RC-O1'])
    expect(patterns()).toContain('/assets/out-assets/RC-O1/')
  })

  it('damaged 批删（非同源专用）：宽失效 root，显式不产生任何逐条详情 pattern', async () => {
    mockRequest.post.mockResolvedValue({
      code: 0,
      data: batchDeleteResult(['ASSET-1', 'ASSET-2']),
      message: '',
    })
    await damagedAssetAPI.batchDeleteDamagedAssets(['ASSET-1', 'ASSET-2'])
    expect(patterns()).toContain('/assets/damaged-assets/')
    const perRecord = patterns().filter(
      (p) =>
        p.startsWith('/assets/damaged-assets/') &&
        p !== '/assets/damaged-assets/' &&
        p !== '/assets/damaged-assets/?',
    )
    expect(perRecord).toEqual([])
  })
})

describe('success_ids 语义（接入后转绿）', () => {
  it('混合失败：只清 success_ids 两条 + 列表，不清失败项', async () => {
    mockRequest.post.mockResolvedValue({
      code: 0,
      data: {
        total: 3,
        success_count: 2,
        fail_count: 1,
        success_ids: ['RC-1', 'RC-2'],
        fail_items: [{ id: 'RC-3', error_code: 'NOT_FOUND', error_message: '不存在' }],
      },
      message: '',
    })
    await lostAssetAPI.batchDeleteLostAssets(['RC-1', 'RC-2', 'RC-3'])
    const ps = patterns()
    expect(ps).toContain('/assets/lost-assets/RC-1/')
    expect(ps).toContain('/assets/lost-assets/RC-2/')
    expect(ps).not.toContain('/assets/lost-assets/RC-3/')
    expect(ps).toContain('/assets/lost-assets/?')
  })

  it('全失败（success_ids=[]）：只清列表，不清任何详情（P0-3）', async () => {
    mockRequest.post.mockResolvedValue({
      code: 0,
      data: {
        total: 1,
        success_count: 0,
        fail_count: 1,
        success_ids: [],
        fail_items: [{ id: 'RC-9', error_code: 'NOT_FOUND', error_message: '不存在' }],
      },
      message: '',
    })
    await lostAssetAPI.batchDeleteLostAssets(['RC-9'])
    expect(patterns()).toEqual(['/assets/lost-assets/?'])
  })
})

describe('await 时序（接入后转绿）', () => {
  it('deferred：resolve 前零失效，resolve 后失效一次；reject 零失效', async () => {
    let resolveDelete!: (v: unknown) => void
    mockRequest.delete.mockImplementationOnce(
      () => new Promise((resolve) => (resolveDelete = resolve)),
    )
    const pending = lostAssetAPI.deleteLostAsset('RC-L1')
    await Promise.resolve()
    expect(mockClearCacheByPattern).not.toHaveBeenCalled()

    resolveDelete({ code: 0, data: {}, message: '' })
    await pending
    expect(patterns()).toContain('/assets/lost-assets/RC-L1/')

    mockClearCacheByPattern.mockClear()
    mockRequest.delete.mockRejectedValueOnce(new Error('network'))
    await expect(lostAssetAPI.deleteLostAsset('RC-L2')).rejects.toThrow()
    expect(mockClearCacheByPattern).not.toHaveBeenCalled()
  })
})

describe('打网语义（MemoryCache 实证，接入后转绿）', () => {
  it('子资源详情清、列表清、他记录不清、统计 key 不清', async () => {
    const cache = new MemoryCache(100)
    cache.set('/assets/lost-assets/RC-1/?', 'detail-1')
    cache.set('/assets/lost-assets/?page=1', 'list')
    cache.set('/assets/lost-assets/RC-2/?', 'detail-2')
    cache.set('/assets/statistics/?', 'stats')

    await lostAssetAPI.deleteLostAsset('RC-1')

    // 复刻实现收到的 pattern 到真实 MemoryCache 上，验证清谁不清谁
    for (const p of patterns()) cache.clearByPattern(p)
    expect(cache.get('/assets/lost-assets/RC-1/?')).toBeUndefined() // 自身详情：清
    expect(cache.get('/assets/lost-assets/?page=1')).toBeUndefined() // 列表：清
    expect(cache.get('/assets/lost-assets/RC-2/?')).toBe('detail-2') // 他记录：不清
    expect(cache.get('/assets/statistics/?')).toBe('stats') // 统计：不清
  })
})

describe('update 豁免留痕（接入后转绿）', () => {
  it('updateLostAsset 不调用子资源失效（列表未缓存故无害，启用时须接入——见 assetCache.ts 豁免注释）', async () => {
    mockRequest.patch.mockResolvedValue({ code: 0, data: {}, message: '' })
    await lostAssetAPI.updateLostAsset({ recordcode: 'RC-L1' } as never)
    const subPatterns = patterns().filter((p) => /^\/assets\/lost-assets\/[^?]+\/$/.test(p))
    expect(subPatterns).toEqual([])
  })
})
