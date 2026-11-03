/**
 * useGroupChildrenCache 单元 spec（OP-07，52 逻辑行上限内）
 *
 * 8 类行为锚（FR-6 榜首 126 逻辑行，旁链零消费 → 独立锚）：
 *   1. 缓存命中零重复请求（ensureChildren 第二次不发）
 *   2. 失败路径 logError + notifyCallerError 单出口 + 缓存落空
 *   3. 筛选白名单透传（contract_code 剔除、空串剔除，R-1 组键原样）
 *   4. hasMoreChildren 计算（无缓存 true / page*size<count true / 等于 false）
 *   5. loadingKeys 并发去重（同 key 第二次直 return 不发请求）
 *   6. loadMoreChildren 追加 vs goToChildPage 覆盖
 *   7. setExpanded(false) 保缓存 / reset 清空；unfold 后 childrenOf 取值
 *   8. 空 group_key 不发请求
 *
 * @dependsOn 真实常量 GROUPED_PASS_THROUGH_KEYS（白名单单一来源，禁 mock）
 */
import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getGroupChildren = vi.fn()

vi.mock('@/api/asset', () => ({
  assetAPI: { getGroupChildren: (...args: unknown[]) => getGroupChildren(...args) },
}))

vi.mock('@/utils/errorHandler', () => ({ notifyCallerError: vi.fn() }))

vi.mock('@/utils/logger', () => ({ logError: vi.fn(), logWarn: vi.fn() }))

import { notifyCallerError } from '@/utils/errorHandler'
import { logError } from '@/utils/logger'
import { useGroupChildrenCache } from '@/composables/useGroupChildrenCache'

type CacheReturn = ReturnType<typeof useGroupChildrenCache>

const PAGE_SIZE = 2

function setup(): CacheReturn {
  return useGroupChildrenCache({
    childPageSize: ref(PAGE_SIZE),
    getFilters: () => ({
      page: 1,
      page_size: 10,
      contract_code: 'CT-ONLY-GROUP',
      no_contract: false,
      asset_code: 'A-77',
      asset_name: '',
    }),
  })
}

function child(code: string) {
  return { asset_code: code, asset_name: `资产${code}`, group_key: 'g1' } as never
}

const res = (count: number, codes: string[]) => ({
  count,
  results: codes.map(child),
})

beforeEach(() => {
  getGroupChildren.mockReset()
  vi.mocked(notifyCallerError).mockClear()
  vi.mocked(logError).mockClear()
})

describe('useGroupChildrenCache', () => {
  it('缓存命中零重复请求：ensureChildren 第二次不发', async () => {
    getGroupChildren.mockResolvedValue(res(3, ['A', 'B']))
    const cache = setup()
    await cache.ensureChildren('g1')
    await cache.ensureChildren('g1')
    expect(getGroupChildren).toHaveBeenCalledTimes(1)
  })

  it('失败路径：logError + notifyCallerError 单出口，缓存落空可重试', async () => {
    getGroupChildren.mockRejectedValueOnce(new Error('boom'))
    getGroupChildren.mockResolvedValueOnce(res(1, ['A']))
    const cache = setup()
    await cache.ensureChildren('g1')
    expect(logError).toHaveBeenCalledWith(
      'composables/useGroupChildrenCache',
      '[组内明细]',
      expect.any(Error),
    )
    expect(notifyCallerError).toHaveBeenCalledTimes(1)
    expect(cache.childrenOf('g1')).toEqual([])
    await cache.loadMoreChildren('g1')
    expect(getGroupChildren).toHaveBeenCalledTimes(2)
    expect(cache.childrenOf('g1').map((c) => c.asset_code)).toEqual(['A'])
  })

  it('白名单透传：contract_code/no_contract/空串剔除，R-1 组键原样', async () => {
    getGroupChildren.mockResolvedValue(res(0, []))
    const cache = setup()
    await cache.ensureChildren('g1')
    const payload = getGroupChildren.mock.calls[0][0] as Record<string, unknown>
    expect(payload.group_key).toBe('g1')
    expect(payload.asset_code).toBe('A-77')
    expect(payload.contract_code).toBeUndefined()
    expect(payload.no_contract).toBeUndefined()
    expect(payload.asset_name).toBeUndefined()
  })

  it('hasMoreChildren：无缓存 true / page*size<count / 打平 false', async () => {
    getGroupChildren.mockResolvedValue(res(5, ['A', 'B']))
    const cache = setup()
    expect(cache.hasMoreChildren('g1')).toBe(true)
    await cache.ensureChildren('g1')
    expect(cache.hasMoreChildren('g1')).toBe(true)
    getGroupChildren.mockResolvedValue(res(4, ['C', 'D']))
    await cache.loadMoreChildren('g1')
    expect(cache.hasMoreChildren('g1')).toBe(false)
  })

  it('loadingKeys 并发去重：同 key 进行中第二次不发', async () => {
    let release!: (v: never) => void
    getGroupChildren.mockReturnValue(new Promise((r) => (release = r as never)))
    const cache = setup()
    const first = cache.loadMoreChildren('g1')
    expect(cache.isLoadingChildren('g1')).toBe(true)
    await cache.loadMoreChildren('g1')
    expect(getGroupChildren).toHaveBeenCalledTimes(1)
    release({ count: 0, results: [] } as never)
    await first
    expect(cache.isLoadingChildren('g1')).toBe(false)
  })

  it('loadMore 追加 vs goToChildPage 覆盖', async () => {
    getGroupChildren.mockResolvedValue(res(4, ['A', 'B']))
    const cache = setup()
    await cache.ensureChildren('g1')
    getGroupChildren.mockResolvedValue(res(4, ['C', 'D']))
    await cache.loadMoreChildren('g1')
    expect(cache.childrenOf('g1').map((c) => c.asset_code)).toEqual(['A', 'B', 'C', 'D'])
    expect(cache.childrenPage('g1')).toBe(2)
    getGroupChildren.mockResolvedValue(res(4, ['E', 'F']))
    await cache.goToChildPage('g1', 1)
    expect(cache.childrenOf('g1').map((c) => c.asset_code)).toEqual(['E', 'F'])
    expect(cache.childrenPage('g1')).toBe(1)
  })

  it('setExpanded(false) 保缓存 / reset 清空；toggleExpand 置位', async () => {
    getGroupChildren.mockResolvedValue(res(2, ['A', 'B']))
    const cache = setup()
    await cache.setExpanded('g1', true)
    expect(cache.isExpanded('g1')).toBe(true)
    await cache.setExpanded('g1', false)
    expect(cache.isExpanded('g1')).toBe(false)
    expect(cache.childrenOf('g1')).toHaveLength(2)
    cache.reset()
    expect(cache.childrenOf('g1')).toEqual([])
    expect(cache.isExpanded('g1')).toBe(false)
    await cache.toggleExpand('g1')
    expect(cache.isExpanded('g1')).toBe(true)
    expect(getGroupChildren).toHaveBeenCalledTimes(2)
  })

  it('空 group_key 不发请求', async () => {
    const cache = setup()
    await cache.goToChildPage('', 1)
    expect(getGroupChildren).not.toHaveBeenCalled()
  })
})
