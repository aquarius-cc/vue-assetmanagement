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
})
