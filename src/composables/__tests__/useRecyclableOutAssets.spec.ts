import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/outAsset', () => ({
  outAssetAPI: {
    getRecyclableOutAssets: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
  },
}))

import { useRecyclableOutAssets } from '../useRecyclableOutAssets'
import { outAssetAPI } from '@/api/outAsset'
import { ElMessage } from 'element-plus'

const mockGetRecyclableOutAssets = vi.mocked(outAssetAPI.getRecyclableOutAssets)
const mockElMessageError = vi.mocked(ElMessage.error)

function mockSuccessResponse(data?: { results?: unknown[]; count?: number }) {
  return {
    results: data?.results ?? [],
    count: data?.count ?? 0,
  }
}

describe('useRecyclableOutAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRecyclableOutAssets.mockResolvedValue(mockSuccessResponse())
  })

  describe('initialization', () => {
    it('returns correct initial state', () => {
      const { list, loading, total, currentPage, pageSize } = useRecyclableOutAssets()

      expect(list.value).toEqual([])
      expect(loading.value).toBe(false)
      expect(total.value).toBe(0)
      expect(currentPage.value).toBe(1)
      expect(pageSize.value).toBe(10)
    })
  })

  describe('search', () => {
    it('calls API with correct params and updates state', async () => {
      const items = [{ id: 1 }, { id: 2 }]
      mockGetRecyclableOutAssets.mockResolvedValue(mockSuccessResponse({ results: items, count: 2 }))

      const { search, list, total, currentPage } = useRecyclableOutAssets()
      await search()

      expect(mockGetRecyclableOutAssets).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
      })
      expect(list.value).toEqual(items)
      expect(total.value).toBe(2)
      expect(currentPage.value).toBe(1)
    })

    it('merges extra params with pagination', async () => {
      const { search } = useRecyclableOutAssets()
      await search({ keyword: 'test' })

      expect(mockGetRecyclableOutAssets).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        keyword: 'test',
      })
    })

    it('resets to page 1 on new search', async () => {
      const { search, currentPage } = useRecyclableOutAssets()

      currentPage.value = 5
      await search({ keyword: 'new' })

      expect(mockGetRecyclableOutAssets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
      )
      expect(currentPage.value).toBe(1)
    })

    it('caches extra params for subsequent page changes', async () => {
      const { search, changePage } = useRecyclableOutAssets()

      await search({ keyword: 'cached' })
      await changePage(3)

      expect(mockGetRecyclableOutAssets).toHaveBeenLastCalledWith({
        page: 3,
        page_size: 10,
        keyword: 'cached',
      })
    })

    it('shows loading state during request', async () => {
      let resolvePromise!: (value: unknown) => void
      mockGetRecyclableOutAssets.mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve }),
      )

      const { search, loading } = useRecyclableOutAssets()

      const searchPromise = search()
      expect(loading.value).toBe(true)

      resolvePromise(mockSuccessResponse())
      await searchPromise

      expect(loading.value).toBe(false)
    })

    it('handles API error gracefully', async () => {
      mockGetRecyclableOutAssets.mockRejectedValue(new Error('Network error'))

      const { search, list, total } = useRecyclableOutAssets()
      await search()

      expect(mockElMessageError).toHaveBeenCalledWith('加载可回收资产列表失败')
      expect(list.value).toEqual([])
      expect(total.value).toBe(0)
    })

    it('calls API without extra params when none provided', async () => {
      const { search } = useRecyclableOutAssets()
      await search()

      expect(mockGetRecyclableOutAssets).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
      })
    })
  })

  describe('changePage', () => {
    it('updates page and calls API', async () => {
      const { changePage, currentPage } = useRecyclableOutAssets()

      await changePage(3)

      expect(currentPage.value).toBe(3)
      expect(mockGetRecyclableOutAssets).toHaveBeenCalledWith({
        page: 3,
        page_size: 10,
      })
    })

    it('does nothing if page is same as current', async () => {
      const { changePage } = useRecyclableOutAssets()

      await changePage(1)

      expect(mockGetRecyclableOutAssets).not.toHaveBeenCalled()
    })

    it('includes cached extra params from prior search', async () => {
      const { search, changePage } = useRecyclableOutAssets()

      await search({ keyword: 'test' })
      vi.clearAllMocks()

      await changePage(2)

      expect(mockGetRecyclableOutAssets).toHaveBeenCalledWith({
        page: 2,
        page_size: 10,
        keyword: 'test',
      })
    })
  })

  describe('reset', () => {
    it('clears all state', async () => {
      const items = [{ id: 1 }, { id: 2 }]
      mockGetRecyclableOutAssets.mockResolvedValue(mockSuccessResponse({ results: items, count: 2 }))

      const { search, reset, list, total, currentPage } = useRecyclableOutAssets()

      await search({ keyword: 'test' })
      expect(list.value).toEqual(items)

      reset()

      expect(list.value).toEqual([])
      expect(total.value).toBe(0)
      expect(currentPage.value).toBe(1)
    })

    it('clears cached extra params so subsequent search has no filters', async () => {
      const { search, reset } = useRecyclableOutAssets()

      await search({ keyword: 'old' })
      reset()
      vi.clearAllMocks()

      await search()

      expect(mockGetRecyclableOutAssets).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
      })
    })
  })
})
