/**
 * [M-13] 写端点统一时序屏障（BF-179）：写未完成 = 零失效，写成功 = 按形态失效，写失败 = 不失效。
 *
 * 形态表为唯一事实源（assetCache.ts 接入清单 + 方案 §2.7）：
 * A 资产精确（详情+列表）/ B 资产宽 / D 资产宽+子资源精确 /
 * E 资产宽+子资源宽 / F 仅列表 / G 子资源精确（详情+列表）
 * #4/10/13/24 批删全失败变体（success_ids: []）→ G 降级仅列表（P0-3，禁止宽清）。
 * 输入前提：A 形态用例喂非空 rc；damaged/out create 的 rc 空值或非 string 时
 * 降级 B（降级路径由既有测试锁定，不属形态变化）。
 * 断言口径：patterns() 全序全等（比 toContain+forbid 更严，宽度锁定自然内含）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  getBlob: vi.fn(),
}))

vi.mock('axios', () => ({
  isAxiosError: vi.fn((err: unknown) => err instanceof Error && 'response' in err),
}))

vi.mock('@/api/config', () => ({
  BASE_URL: 'https://api.test/api/v1',
}))

import { assetAPI } from '@/api/asset'
import { brokenAssetAPI } from '@/api/brokenAsset'
import { lostAssetAPI } from '@/api/lostAsset'
import { foundAssetAPI } from '@/api/foundAsset'
import { damagedAssetAPI } from '@/api/damagedAsset'
import { repairAssetAPI } from '@/api/repairAsset'
import { recycleAssetAPI } from '@/api/recycleAsset'
import { outAssetAPI } from '@/api/outAsset'

type WriteMethod = 'post' | 'put' | 'delete'

interface TimingCase {
  name: string
  method: WriteMethod
  invoke: () => Promise<unknown>
  /** deferred resolve 载荷（默认 { code: 0, data: {} }） */
  response?: { code: number; data: unknown; message: string }
  /** 期望的 clearCacheByPattern 调用序列（全序全等） */
  expected: string[]
}

function patterns(): string[] {
  return mockClearCacheByPattern.mock.calls.map((c: unknown[]) => c[0] as string)
}

function defer<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0))
}

const A_RC = ['/assets/assets/RC1/', '/assets/assets/?']
const B_WIDE = ['/assets/assets/']

// —— 37 个写端点：形态期望（§2.7 表）——
const CASES: TimingCase[] = [
  // ① broken
  {
    name: '#1 broken.createBrokenAsset (A)',
    method: 'post',
    invoke: () => brokenAssetAPI.createBrokenAsset({ asset_recordcode: 'RC1' } as never),
    expected: A_RC,
  },
  {
    name: '#2 broken.batchCreateBrokenAssets (B)',
    method: 'post',
    invoke: () => brokenAssetAPI.batchCreateBrokenAssets({} as never),
    expected: B_WIDE,
  },
  {
    name: '#3 broken.deleteBrokenAsset (G)',
    method: 'delete',
    invoke: () => brokenAssetAPI.deleteBrokenAsset('RC1'),
    expected: ['/assets/broken-assets/RC1/', '/assets/broken-assets/?'],
  },
  {
    name: '#4 broken.batchDeleteBrokenAssets (G, 全失败 → P0-3 仅列表)',
    method: 'post',
    invoke: () => brokenAssetAPI.batchDeleteBrokenAssets(['RC1', 'RC2']),
    response: { code: 0, data: { success_ids: [] }, message: '' },
    expected: ['/assets/broken-assets/?'],
  },
  // ② lost
  {
    name: '#5 lost.createLostAsset (A)',
    method: 'post',
    invoke: () => lostAssetAPI.createLostAsset({ asset_recordcode: 'RC1' } as never),
    expected: A_RC,
  },
  {
    name: '#6 lost.batchCreateLostAssets (B)',
    method: 'post',
    invoke: () => lostAssetAPI.batchCreateLostAssets({} as never),
    expected: B_WIDE,
  },
  {
    name: '#7 lost.markAssetAsLost (A)',
    method: 'post',
    invoke: () => lostAssetAPI.markAssetAsLost('RC1', { lost_reason: 'r' } as never),
    expected: A_RC,
  },
  {
    name: '#8 lost.foundAsset (A)',
    method: 'post',
    invoke: () => lostAssetAPI.foundAsset('RC1', {}),
    expected: A_RC,
  },
  {
    name: '#9 lost.deleteLostAsset (G)',
    method: 'delete',
    invoke: () => lostAssetAPI.deleteLostAsset('RC1'),
    expected: ['/assets/lost-assets/RC1/', '/assets/lost-assets/?'],
  },
  {
    name: '#10 lost.batchDeleteLostAssets (G, 全失败 → P0-3 仅列表)',
    method: 'post',
    invoke: () => lostAssetAPI.batchDeleteLostAssets(['RC1', 'RC2']),
    response: { code: 0, data: { success_ids: [] }, message: '' },
    expected: ['/assets/lost-assets/?'],
  },
  // ③ found
  {
    name: '#11 found.createFoundAsset (A)',
    method: 'post',
    invoke: () => foundAssetAPI.createFoundAsset({ asset_recordcode: 'RC1' } as never),
    expected: A_RC,
  },
  {
    name: '#12 found.deleteFoundAsset (G)',
    method: 'delete',
    invoke: () => foundAssetAPI.deleteFoundAsset('RC1'),
    expected: ['/assets/found-assets/RC1/', '/assets/found-assets/?'],
  },
  {
    name: '#13 found.batchDeleteFoundAssets (G, 全失败 → P0-3 仅列表)',
    method: 'post',
    invoke: () => foundAssetAPI.batchDeleteFoundAssets(['RC1', 'RC2']),
    response: { code: 0, data: { success_ids: [] }, message: '' },
    expected: ['/assets/found-assets/?'],
  },
  // ④ damaged
  {
    name: '#14 damaged.createDamagedAsset (A, rc 非空)',
    method: 'post',
    invoke: () => damagedAssetAPI.createDamagedAsset({ asset_recordcode: 'RC1' } as never),
    expected: A_RC,
  },
  {
    name: '#15 damaged.approveDamagedAsset (B)',
    method: 'post',
    invoke: () => damagedAssetAPI.approveDamagedAsset('DC1'),
    expected: B_WIDE,
  },
  {
    name: '#16 damaged.rejectDamagedAsset (B)',
    method: 'post',
    invoke: () => damagedAssetAPI.rejectDamagedAsset('DC1'),
    expected: B_WIDE,
  },
  {
    name: '#17 damaged.deleteDamagedAsset (D)',
    method: 'delete',
    invoke: () => damagedAssetAPI.deleteDamagedAsset('DC1'),
    expected: ['/assets/assets/', '/assets/damaged-assets/DC1/', '/assets/damaged-assets/?'],
  },
  {
    name: '#18 damaged.batchDeleteDamagedAssets (E, 非同源宽)',
    method: 'post',
    invoke: () => damagedAssetAPI.batchDeleteDamagedAssets(['RC1']),
    expected: ['/assets/assets/', '/assets/damaged-assets/'],
  },
  // ⑤ repair
  {
    name: '#19 repair.createRepairAsset (B)',
    method: 'post',
    invoke: () => repairAssetAPI.createRepairAsset({} as never),
    expected: B_WIDE,
  },
  {
    name: '#20 repair.repairAsset (A)',
    method: 'post',
    invoke: () => repairAssetAPI.repairAsset('RC1', {} as never),
    expected: A_RC,
  },
  {
    name: '#21 repair.repairDone (A)',
    method: 'post',
    invoke: () =>
      repairAssetAPI.repairDone('RC1', {
        actual_return_date: '2026-11-05',
        physical_grade_after: 'good',
      } as never),
    expected: A_RC,
  },
  {
    name: '#22 repair.repairFailed (A)',
    method: 'post',
    invoke: () => repairAssetAPI.repairFailed('RC1'),
    expected: A_RC,
  },
  {
    name: '#23 repair.deleteRepairAsset (G)',
    method: 'delete',
    invoke: () => repairAssetAPI.deleteRepairAsset('RC1'),
    expected: ['/assets/repair-assets/RC1/', '/assets/repair-assets/?'],
  },
  {
    name: '#24 repair.batchDeleteRepairAssets (G, 全失败 → P0-3 仅列表)',
    method: 'post',
    invoke: () => repairAssetAPI.batchDeleteRepairAssets(['RC1', 'RC2']),
    response: { code: 0, data: { success_ids: [] }, message: '' },
    expected: ['/assets/repair-assets/?'],
  },
  // ⑥ recycle
  {
    name: '#25 recycle.createRecycleAsset (B)',
    method: 'post',
    invoke: () => recycleAssetAPI.createRecycleAsset({} as never),
    expected: B_WIDE,
  },
  {
    name: '#26 recycle.batchCreateRecycleAssets (B)',
    method: 'post',
    invoke: () => recycleAssetAPI.batchCreateRecycleAssets({} as never),
    expected: B_WIDE,
  },
  {
    name: '#27 recycle.deleteRecycleAsset (D)',
    method: 'delete',
    invoke: () => recycleAssetAPI.deleteRecycleAsset('OC1'),
    expected: ['/assets/assets/', '/assets/recycle-assets/OC1/', '/assets/recycle-assets/?'],
  },
  {
    name: '#28 recycle.batchDeleteRecycleAssets (D)',
    method: 'post',
    invoke: () => recycleAssetAPI.batchDeleteRecycleAssets(['OC1', 'OC2']),
    expected: [
      '/assets/assets/',
      '/assets/recycle-assets/OC1/',
      '/assets/recycle-assets/OC2/',
      '/assets/recycle-assets/?',
    ],
  },
  // ⑦ out
  {
    name: '#29 out.createOutAsset (A, rc 非空)',
    method: 'post',
    invoke: () => outAssetAPI.createOutAsset({ asset_recordcode: 'RC1' } as never),
    expected: A_RC,
  },
  {
    name: '#30 out.batchCreateOutAssets (B)',
    method: 'post',
    invoke: () => outAssetAPI.batchCreateOutAssets([{} as never]),
    expected: B_WIDE,
  },
  {
    name: '#31 out.deleteOutAsset (D)',
    method: 'delete',
    invoke: () => outAssetAPI.deleteOutAsset('OC1'),
    expected: ['/assets/assets/', '/assets/out-assets/OC1/', '/assets/out-assets/?'],
  },
  {
    name: '#32 out.batchDeleteOutAssets (D)',
    method: 'post',
    invoke: () => outAssetAPI.batchDeleteOutAssets(['OC1', 'OC2']),
    expected: [
      '/assets/assets/',
      '/assets/out-assets/OC1/',
      '/assets/out-assets/OC2/',
      '/assets/out-assets/?',
    ],
  },
  // ⑧ asset.ts（#33/#34/#37 为步骤 5 范围：改造前时序用例红，即先红锚的活证）
  {
    name: '#33 asset.updateAsset (A, 详情 pattern 显式化)',
    method: 'put',
    invoke: () => assetAPI.updateAsset({ recordcode: 'RC1' } as never),
    expected: A_RC,
  },
  {
    name: '#34 asset.deleteAsset (A, 详情 pattern 显式化)',
    method: 'delete',
    invoke: () => assetAPI.deleteAsset('RC1'),
    expected: A_RC,
  },
  {
    name: '#35 asset.markAssetAsBroken (A)',
    method: 'post',
    invoke: () => assetAPI.markAssetAsBroken('RC1', {}),
    expected: A_RC,
  },
  {
    name: '#36 asset.batchDeleteAssets (B, 宽)',
    method: 'post',
    invoke: () => assetAPI.batchDeleteAssets(['A1', 'A2']),
    expected: B_WIDE,
  },
  {
    name: '#37 asset.batchCreateAssets (F, 仅列表禁止宽)',
    method: 'post',
    invoke: () => assetAPI.batchCreateAssets([{} as never]),
    expected: ['/assets/assets/?'],
  },
]

// —— 8 条失败分支：写失败零失效（代表性端点限 A 类必修，存量已 await 端点无先红锚意义）——
const FAIL_CASES: {
  name: string
  invoke: () => Promise<unknown>
  reject?: boolean
  response?: { code: number; data: unknown; message: string }
}[] = [
  {
    name: '网络 reject: broken.createBrokenAsset',
    invoke: () => brokenAssetAPI.createBrokenAsset({ asset_recordcode: 'RC1' } as never),
    reject: true,
  },
  {
    name: '网络 reject: lost.createLostAsset',
    invoke: () => lostAssetAPI.createLostAsset({ asset_recordcode: 'RC1' } as never),
    reject: true,
  },
  {
    name: '网络 reject: found.createFoundAsset',
    invoke: () => foundAssetAPI.createFoundAsset({ asset_recordcode: 'RC1' } as never),
    reject: true,
  },
  {
    name: '网络 reject: damaged.createDamagedAsset',
    invoke: () => damagedAssetAPI.createDamagedAsset({ asset_recordcode: 'RC1' } as never),
    reject: true,
  },
  {
    name: '网络 reject: repair.createRepairAsset',
    invoke: () => repairAssetAPI.createRepairAsset({} as never),
    reject: true,
  },
  {
    name: '网络 reject: recycle.createRecycleAsset',
    invoke: () => recycleAssetAPI.createRecycleAsset({} as never),
    reject: true,
  },
  {
    name: '网络 reject: out.createOutAsset',
    invoke: () => outAssetAPI.createOutAsset({ asset_recordcode: 'RC1' } as never),
    reject: true,
  },
  {
    name: '业务失败 code!==0: lost.createLostAsset',
    invoke: () => lostAssetAPI.createLostAsset({ asset_recordcode: 'RC1' } as never),
    response: { code: 1, data: {}, message: '业务失败' },
  },
]

describe('M-13 写端点统一时序屏障（37 端点 / 43 次失效调用）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  for (const c of CASES) {
    it(`${c.name}：写未完成零失效，写成功后按形态失效`, async () => {
      const d = defer<{ code: number; data: unknown; message: string }>()
      mockRequest[c.method].mockReturnValueOnce(d.promise)

      const pending = c.invoke()
      await flush()
      expect(mockClearCacheByPattern).not.toHaveBeenCalled() // ← 先红锚

      d.resolve(c.response ?? { code: 0, data: {}, message: '' })
      await pending
      expect(patterns()).toEqual(c.expected)
    })
  }

  for (const c of FAIL_CASES) {
    it(`${c.name} → 零失效`, async () => {
      if (c.reject) {
        mockRequest.post.mockRejectedValueOnce(new Error('network down'))
      } else {
        mockRequest.post.mockResolvedValueOnce(c.response as never)
      }
      await expect(c.invoke()).rejects.toBeTruthy()
      expect(mockClearCacheByPattern).not.toHaveBeenCalled()
    })
  }
})
