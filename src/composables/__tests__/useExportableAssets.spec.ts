import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSearchAvailableAssets } = vi.hoisted(() => ({
  mockSearchAvailableAssets: vi.fn(),
}))

vi.mock('@/api/asset', () => ({
  assetAPI: { searchAvailableAssets: mockSearchAvailableAssets },
}))

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}))

vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
}))

import { useExportableAssets } from '../useExportableAssets'
import { ElMessage } from 'element-plus'

const mockElMessageError = vi.mocked(ElMessage.error)

function mockSuccessResponse(data?: { results?: unknown[]; count?: number }) {
  return {
    results: data?.results ?? [],
    count: data?.count ?? 0,
  }
}

describe('useExportableAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchAvailableAssets.mockResolvedValue(mockSuccessResponse())
  })

  describe('initialization', () => {
    it('returns correct initial state', () => {
      const { list, loading, total, currentPage, pageSize } = useExportableAssets()

      expect(list.value).toEqual([])
      expect(loading.value).toBe(false)
      expect(total.value).toBe(0)
      expect(currentPage.value).toBe(1)
      expect(pageSize.value).toBe(10)
    })
  })

  describe('search', () => {
    it('calls api with page and page_size defaults', async () => {
      const items = [{ asset_code: 'A001' }]
      mockSearchAvailableAssets.mockResolvedValue(mockSuccessResponse({ results: items, count: 1 }))

      const { search, list, total } = useExportableAssets()
      await search()

      expect(mockSearchAvailableAssets).toHaveBeenCalledWith({ page: 1, page_size: 10 })
      expect(list.value).toEqual(items)
      expect(total.value).toBe(1)
    })

    it('merges extra params with pagination', async () => {
      const { search } = useExportableAssets()
      await search({ keyword: 'test' })

      expect(mockSearchAvailableAssets).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        keyword: 'test',
      })
    })

    it('caches params for subsequent searches without args', async () => {
      const { search } = useExportableAssets()
      await search({ keyword: 'cached' })
      vi.clearAllMocks()

      await search()

      expect(mockSearchAvailableAssets).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        keyword: 'cached',
      })
    })

    it('shows loading state during request', async () => {
      let resolvePromise!: (value: unknown) => void
      mockSearchAvailableAssets.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          }),
      )

      const { search, loading } = useExportableAssets()
      const searchPromise = search()
      expect(loading.value).toBe(true)

      resolvePromise(mockSuccessResponse())
      await searchPromise

      expect(loading.value).toBe(false)
    })

    it('handles API error gracefully', async () => {
      mockSearchAvailableAssets.mockRejectedValue(new Error('Network error'))

      const { search, list, total } = useExportableAssets()
      await search()

      expect(mockElMessageError).toHaveBeenCalledWith('加载可出库资产列表失败')
      expect(list.value).toEqual([])
      expect(total.value).toBe(0)
    })
  })

  describe('changePage', () => {
    it('updates page and calls api with cached params', async () => {
      const { search, changePage, currentPage } = useExportableAssets()
      await search({ keyword: 'test' })

      await changePage(3)

      expect(currentPage.value).toBe(3)
      expect(mockSearchAvailableAssets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, keyword: 'test' }),
      )
    })

    it('does nothing if page is same as current', async () => {
      const { changePage } = useExportableAssets()

      await changePage(1)

      expect(mockSearchAvailableAssets).not.toHaveBeenCalled()
    })
  })

  describe('reset', () => {
    it('clears state and cached params', async () => {
      const { search, reset, list, total, currentPage } = useExportableAssets()
      await search({ keyword: 'test' })

      reset()

      expect(list.value).toEqual([])
      expect(total.value).toBe(0)
      expect(currentPage.value).toBe(1)

      vi.clearAllMocks()
      await search()

      expect(mockSearchAvailableAssets).toHaveBeenCalledWith(
        expect.not.objectContaining({ keyword: 'test' }),
      )
    })
  })

  describe('race guard [M-39]', () => {
    /** 按调用顺序登记的延迟 resolve/reject 队列（先红后绿红证 B 用） */
    function deferredQueue() {
      const resolvers: Array<(v: unknown) => void> = []
      const rejecters: Array<(e: unknown) => void> = []
      mockSearchAvailableAssets.mockImplementation(
        () =>
          new Promise((resolve, reject) => {
            resolvers.push(resolve)
            rejecters.push(reject)
          }),
      )
      return { resolvers, rejecters }
    }

    it('requests write currentPage before response resolves (请求前写)', async () => {
      const { resolvers } = deferredQueue()
      const { changePage, currentPage } = useExportableAssets()

      const pending = changePage(2)
      expect(currentPage.value).toBe(2) // 修复前：响应后才回写（:34），此处仍为 1 → 红

      resolvers[0](mockSuccessResponse())
      await pending
      expect(currentPage.value).toBe(2)
    })

    it('slow response does not overwrite newer result (seq 守卫)', async () => {
      const { resolvers } = deferredQueue()
      const { search, changePage, list, total, currentPage } = useExportableAssets()

      const p1 = search() // 请求1 page=1（慢）
      const p2 = changePage(2) // 请求2 page=2（快）
      resolvers[1](mockSuccessResponse({ results: [{ asset_code: 'FRESH' }], count: 1 }))
      await p2
      resolvers[0](mockSuccessResponse({ results: [{ asset_code: 'STALE' }], count: 99 }))
      await p1

      expect(list.value).toEqual([{ asset_code: 'FRESH' }]) // 修复前：STALE 覆盖 → 红
      expect(total.value).toBe(1)
      expect(currentPage.value).toBe(2)
    })

    it('stale failure does not clear newer result (seq 守卫 catch 分支)', async () => {
      const { resolvers, rejecters } = deferredQueue()
      const { search, changePage, list, total } = useExportableAssets()

      const p1 = search()
      const p2 = changePage(2)
      resolvers[1](mockSuccessResponse({ results: [{ asset_code: 'FRESH' }], count: 1 }))
      await p2
      mockElMessageError.mockClear()
      rejecters[0](new Error('slow network fail'))
      await p1

      expect(list.value).toEqual([{ asset_code: 'FRESH' }]) // 修复前：过期失败清空 → 红
      expect(total.value).toBe(1)
      expect(mockElMessageError).not.toHaveBeenCalled()
    })
  })

  describe('AUD-48 失败页码回滚 (BF-150)', () => {
    it('changePage 失败时 currentPage 回滚到最近成功页', async () => {
      const { search, changePage, currentPage, list, total } = useExportableAssets()
      await search() // 第 1 页成功 (最近成功页锚 = 1)
      mockSearchAvailableAssets.mockRejectedValueOnce(new Error('boom'))
      await changePage(2)
      // 修复前：乐观写后不回滚 → currentPage=2, 该页被早退守卫锁死 → 红
      expect(currentPage.value).toBe(1)
      expect(list.value).toEqual([])
      expect(total.value).toBe(0)
    })

    it('失败页可重试 (回滚后再点同页不被早退拦截)', async () => {
      const { search, changePage, currentPage } = useExportableAssets()
      await search()
      mockSearchAvailableAssets.mockRejectedValueOnce(new Error('boom'))
      await changePage(2)
      expect(currentPage.value).toBe(1)
      mockSearchAvailableAssets.mockClear()
      await changePage(2) // 修复前：被早退守卫拦截, 请求不发 → 红
      expect(mockSearchAvailableAssets).toHaveBeenCalledTimes(1)
      expect(mockSearchAvailableAssets).toHaveBeenCalledWith({ page: 2, page_size: 10 })
      expect(currentPage.value).toBe(2)
    })
  })
})
