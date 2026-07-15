import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSearchAssets = vi.fn()

vi.mock('@/stores/assetStore', () => ({
  useAssetStore: () => ({
    searchAssets: mockSearchAssets,
  }),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
  },
}))

import { useWastedAssets } from '../useWastedAssets'
import { ElMessage } from 'element-plus'

const mockElMessageError = vi.mocked(ElMessage.error)

function mockSuccessResponse(data?: { results?: unknown[]; count?: number }) {
  return {
    results: data?.results ?? [],
    count: data?.count ?? 0,
  }
}

describe('useWastedAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchAssets.mockResolvedValue(mockSuccessResponse())
  })

  describe('initialization', () => {
    it('returns correct initial state', () => {
      const { list, loading, total, currentPage, pageSize } = useWastedAssets()

      expect(list.value).toEqual([])
      expect(loading.value).toBe(false)
      expect(total.value).toBe(0)
      expect(currentPage.value).toBe(1)
      expect(pageSize.value).toBe(10)
    })
  })

  describe('search', () => {
    it('calls store.searchAssets with correct params', async () => {
      const items = [{ id: 1 }, { id: 2 }]
      mockSearchAssets.mockResolvedValue(mockSuccessResponse({ results: items, count: 2 }))

      const { search, list, total } = useWastedAssets()
      await search()

      expect(mockSearchAssets).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        asset_current_status: 'scrapped',
      })
      expect(list.value).toEqual(items)
      expect(total.value).toBe(2)
    })

    it('merges extra params with pagination', async () => {
      const { search } = useWastedAssets()
      await search({ keyword: 'test' })

      expect(mockSearchAssets).toHaveBeenCalledWith({
        page: 1,
        page_size: 10,
        keyword: 'test',
        asset_current_status: 'scrapped',
      })
    })

    it('resets to page 1 on new search', async () => {
      const { search, currentPage } = useWastedAssets()
      currentPage.value = 5

      await search({ keyword: 'new' })

      expect(mockSearchAssets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
      )
      expect(currentPage.value).toBe(1)
    })

    it('caches extra params for subsequent page changes', async () => {
      const { search, changePage } = useWastedAssets()

      await search({ keyword: 'cached' })
      await changePage(3)

      expect(mockSearchAssets).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 3, keyword: 'cached' }),
      )
    })

    it('shows loading state during request', async () => {
      let resolvePromise!: (value: unknown) => void
      mockSearchAssets.mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve }),
      )

      const { search, loading } = useWastedAssets()

      const searchPromise = search()
      expect(loading.value).toBe(true)

      resolvePromise(mockSuccessResponse())
      await searchPromise

      expect(loading.value).toBe(false)
    })

    it('handles API error gracefully', async () => {
      mockSearchAssets.mockRejectedValue(new Error('Network error'))

      const { search, list, total } = useWastedAssets()
      await search()

      expect(mockElMessageError).toHaveBeenCalledWith('加载已报废资产列表失败')
      expect(list.value).toEqual([])
      expect(total.value).toBe(0)
    })
  })

  describe('changePage', () => {
    it('updates page and calls store', async () => {
      const { changePage, currentPage } = useWastedAssets()

      await changePage(3)

      expect(currentPage.value).toBe(3)
      expect(mockSearchAssets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3 }),
      )
    })

    it('does nothing if page is same as current', async () => {
      const { changePage } = useWastedAssets()

      await changePage(1)

      expect(mockSearchAssets).not.toHaveBeenCalled()
    })

    it('includes cached extra params from prior search', async () => {
      const { search, changePage } = useWastedAssets()

      await search({ keyword: 'test' })
      vi.clearAllMocks()

      await changePage(2)

      expect(mockSearchAssets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, keyword: 'test' }),
      )
    })
  })

  describe('reset', () => {
    it('clears all state', async () => {
      const { search, reset, list, total, currentPage } = useWastedAssets()

      await search({ keyword: 'test' })
      reset()

      expect(list.value).toEqual([])
      expect(total.value).toBe(0)
      expect(currentPage.value).toBe(1)
    })

    it('clears cached extra params', async () => {
      const { search, reset } = useWastedAssets()

      await search({ keyword: 'old' })
      reset()
      vi.clearAllMocks()

      await search()

      expect(mockSearchAssets).toHaveBeenCalledWith(
        expect.not.objectContaining({ keyword: 'old' }),
      )
    })
  })
})
