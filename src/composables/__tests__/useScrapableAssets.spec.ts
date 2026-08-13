import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCombineSearch = vi.fn()

vi.mock('@/stores/assetStore', () => ({
  useAssetStore: () => ({
    combineSearch: mockCombineSearch,
  }),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
  },
}))

import { useScrapableAssets } from '../useScrapableAssets'
import { ElMessage } from 'element-plus'

const mockElMessageError = vi.mocked(ElMessage.error)

function mockSuccessResponse(data?: { results?: unknown[]; count?: number }) {
  return {
    results: data?.results ?? [],
    count: data?.count ?? 0,
  }
}

describe('useScrapableAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCombineSearch.mockResolvedValue(mockSuccessResponse())
  })

  describe('initialization', () => {
    it('returns correct initial state', () => {
      const { list, loading, total, currentPage, pageSize } = useScrapableAssets()

      expect(list.value).toEqual([])
      expect(loading.value).toBe(false)
      expect(total.value).toBe(0)
      expect(currentPage.value).toBe(1)
      expect(pageSize.value).toBe(10)
    })
  })

  describe('search', () => {
    it('calls store.combineSearch with correct params', async () => {
      const items = [{ id: 1 }]
      mockCombineSearch.mockResolvedValue(mockSuccessResponse({ results: items, count: 1 }))

      const { search, list, total } = useScrapableAssets()
      await search()

      expect(mockCombineSearch).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        asset_current_status__in: 'in_use,recycled_pending,broken,lost',
      })
      expect(list.value).toEqual(items)
      expect(total.value).toBe(1)
    })

    it('merges extra params with pagination', async () => {
      const { search } = useScrapableAssets()
      await search({ keyword: 'test' })

      expect(mockCombineSearch).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        keyword: 'test',
        asset_current_status__in: 'in_use,recycled_pending,broken,lost',
      })
    })

    it('resets to page 1 on new search', async () => {
      const { search, currentPage } = useScrapableAssets()
      currentPage.value = 5

      await search({ keyword: 'new' })

      expect(mockCombineSearch).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
      expect(currentPage.value).toBe(1)
    })

    it('caches extra params for subsequent page changes', async () => {
      const { search, changePage } = useScrapableAssets()

      await search({ keyword: 'cached' })
      await changePage(3)

      expect(mockCombineSearch).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 3, keyword: 'cached' }),
      )
    })

    it('shows loading state during request', async () => {
      let resolvePromise!: (value: unknown) => void
      mockCombineSearch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve
          }),
      )

      const { search, loading } = useScrapableAssets()

      const searchPromise = search()
      expect(loading.value).toBe(true)

      resolvePromise(mockSuccessResponse())
      await searchPromise

      expect(loading.value).toBe(false)
    })

    it('handles API error gracefully', async () => {
      mockCombineSearch.mockRejectedValue(new Error('Network error'))

      const { search, list, total } = useScrapableAssets()
      await search()

      expect(mockElMessageError).toHaveBeenCalledWith('加载可报废资产列表失败')
      expect(list.value).toEqual([])
      expect(total.value).toBe(0)
    })
  })

  describe('changePage', () => {
    it('updates page and calls store', async () => {
      const { changePage, currentPage } = useScrapableAssets()

      await changePage(3)

      expect(currentPage.value).toBe(3)
      expect(mockCombineSearch).toHaveBeenCalledWith(expect.objectContaining({ page: 3 }))
    })

    it('does nothing if page is same as current', async () => {
      const { changePage } = useScrapableAssets()

      await changePage(1)

      expect(mockCombineSearch).not.toHaveBeenCalled()
    })

    it('includes cached extra params from prior search', async () => {
      const { search, changePage } = useScrapableAssets()

      await search({ keyword: 'test' })
      vi.clearAllMocks()

      await changePage(2)

      expect(mockCombineSearch).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, keyword: 'test' }),
      )
    })
  })

  describe('reset', () => {
    it('clears all state', async () => {
      const { search, reset, list, total, currentPage } = useScrapableAssets()

      await search({ keyword: 'test' })
      reset()

      expect(list.value).toEqual([])
      expect(total.value).toBe(0)
      expect(currentPage.value).toBe(1)
    })

    it('clears cached extra params', async () => {
      const { search, reset } = useScrapableAssets()

      await search({ keyword: 'old' })
      reset()
      vi.clearAllMocks()

      await search()

      expect(mockCombineSearch).toHaveBeenCalledWith(
        expect.not.objectContaining({ keyword: 'old' }),
      )
    })
  })
})
