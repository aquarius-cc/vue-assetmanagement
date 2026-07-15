import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { usePaginationSearch } from '../usePaginationSearch'

// Mock ElMessage
vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('usePaginationSearch', () => {
  let mockStore: {
    getList: ReturnType<typeof vi.fn>
    pagination: {
      page: ReturnType<typeof vi.fn>
      page_size: ReturnType<typeof vi.fn>
      total: ReturnType<typeof vi.fn>
    }
    list: ReturnType<typeof vi.fn>
    loading: ReturnType<typeof vi.fn>
    refreshFlag?: ReturnType<typeof vi.fn>
    setRefreshFlag?: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockStore = {
      getList: vi.fn().mockResolvedValue({ count: 0, results: [] }),
      pagination: {
        page: ref(1),
        page_size: ref(20),
        total: ref(0),
      },
      list: computed(() => []),
      loading: computed(() => false),
      refreshFlag: ref(false),
      setRefreshFlag: vi.fn(),
    }
  })

  describe('initialization', () => {
    it('initializes with default values', () => {
      const { currentPage, pageSize, search, total, isSearching } = usePaginationSearch({
        store: mockStore,
      })
      
      expect(currentPage.value).toBe(1)
      expect(pageSize.value).toBe(20)
      expect(search.value).toBe('')
      expect(total.value).toBe(0)
      expect(isSearching.value).toBe(false)
    })

    it('initializes with custom page size options', () => {
      const { pageSizeOptions } = usePaginationSearch({
        store: mockStore,
        pageSizeOptions: [10, 25, 50],
      })
      
      expect(pageSizeOptions).toEqual([10, 25, 50])
    })

    it('initializes with default page size options', () => {
      const { pageSizeOptions } = usePaginationSearch({
        store: mockStore,
      })
      
      expect(pageSizeOptions).toEqual([20, 50, 100, 200, 500])
    })
  })

  describe('loadList', () => {
    it('loads data from store', async () => {
      const { loadList } = usePaginationSearch({
        store: mockStore,
      })
      
      await loadList(1, 20)
      
      expect(mockStore.getList).toHaveBeenCalledWith({ page: 1, page_size: 20 })
    })

    it('updates total from response', async () => {
      mockStore.getList.mockResolvedValue({ count: 100, results: [] })
      
      const { loadList, total } = usePaginationSearch({
        store: mockStore,
      })
      
      await loadList(1, 20)
      
      expect(total.value).toBe(100)
    })

    it('handles load failure', async () => {
      const error = new Error('Load failed')
      mockStore.getList.mockRejectedValue(error)
      
      const { loadList } = usePaginationSearch({
        store: mockStore,
      })
      
      await expect(loadList(1, 20)).rejects.toThrow('Load failed')
    })
  })

  describe('performSearch', () => {
    it('calls search function with keyword', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ count: 0, results: [] })
      
      const { performSearch } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: mockSearch,
        },
      })
      
      await performSearch('test')
      
      expect(mockSearch).toHaveBeenCalledWith('test', 1, 20)
    })

    it('updates search results', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 2,
        results: [{ id: 1 }, { id: 2 }],
      })
      
      const { performSearch, searchResults, searchTotal } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: mockSearch,
        },
      })
      
      await performSearch('test')
      
      expect(searchResults.value).toEqual([{ id: 1 }, { id: 2 }])
      expect(searchTotal.value).toBe(2)
    })

    it('clears results for empty keyword', async () => {
      const mockSearch = vi.fn()
      
      const { performSearch, searchResults, searchTotal } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: mockSearch,
        },
      })
      
      await performSearch('')
      
      expect(mockSearch).not.toHaveBeenCalled()
      expect(searchResults.value).toEqual([])
      expect(searchTotal.value).toBe(0)
    })

    it('handles search failure', async () => {
      const error = new Error('Search failed')
      const mockSearch = vi.fn().mockRejectedValue(error)
      
      const { performSearch } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: mockSearch,
        },
      })
      
      await expect(performSearch('test')).rejects.toThrow('Search failed')
    })
  })

  describe('handleSizeChange', () => {
    it('updates page size and reloads data', async () => {
      const { handleSizeChange, pageSize } = usePaginationSearch({
        store: mockStore,
      })
      
      await handleSizeChange(50)
      
      expect(pageSize.value).toBe(50)
      expect(mockStore.getList).toHaveBeenCalled()
    })

    it('resets to page 1 when page size changes', async () => {
      const { handleSizeChange, currentPage } = usePaginationSearch({
        store: mockStore,
      })
      
      currentPage.value = 5
      
      await handleSizeChange(50)
      
      expect(currentPage.value).toBe(1)
    })
  })

  describe('handleCurrentChange', () => {
    it('updates current page and reloads data', async () => {
      const { handleCurrentChange, currentPage } = usePaginationSearch({
        store: mockStore,
      })
      
      await handleCurrentChange(3)
      
      expect(currentPage.value).toBe(3)
      expect(mockStore.getList).toHaveBeenCalled()
    })
  })

  describe('tableData', () => {
    it('returns store list when not searching', () => {
      const mockList = [{ id: 1 }, { id: 2 }]
      mockStore.list = computed(() => mockList)
      
      const { tableData } = usePaginationSearch({
        store: mockStore,
      })
      
      expect(tableData.value).toEqual(mockList)
    })

    it('returns search results when searching', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        count: 2,
        results: [{ id: 10 }, { id: 20 }],
      })
      
      const { performSearch, tableData } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: mockSearch,
        },
      })
      
      await performSearch('test')
      
      expect(tableData.value).toEqual([{ id: 10 }, { id: 20 }])
    })
  })

  describe('resetToFirstPage', () => {
    it('resets page to 1 and clears search', () => {
      const { resetToFirstPage, currentPage, search } = usePaginationSearch({
        store: mockStore,
      })
      
      currentPage.value = 5
      search.value = 'test'
      
      resetToFirstPage()
      
      expect(currentPage.value).toBe(1)
      expect(search.value).toBe('')
    })
  })

  describe('refreshCurrentPage', () => {
    it('reloads current page data', async () => {
      const { refreshCurrentPage } = usePaginationSearch({
        store: mockStore,
      })
      
      await refreshCurrentPage()
      
      expect(mockStore.getList).toHaveBeenCalled()
    })

    it('re-searches when search is active', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ count: 0, results: [] })
      
      const { refreshCurrentPage, search } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: mockSearch,
        },
      })
      
      search.value = 'test'
      
      await refreshCurrentPage()
      
      expect(mockSearch).toHaveBeenCalled()
    })
  })

  describe('searchParams', () => {
    it('handles multi-param search', async () => {
      const mockSearchWithParams = vi.fn().mockResolvedValue({ count: 0, results: [] })
      
      const { performSearchWithParams, searchParams } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: vi.fn(),
          performSearchWithParams: mockSearchWithParams,
        },
      })
      
      await performSearchWithParams({ keyword: 'test', status: 'active' })
      
      expect(mockSearchWithParams).toHaveBeenCalledWith(
        { keyword: 'test', status: 'active' },
        1,
        20,
      )
      expect(searchParams.value).toEqual({ keyword: 'test', status: 'active' })
    })

    it('falls back to single search when multi-param not available', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ count: 0, results: [] })
      
      const { performSearchWithParams } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: mockSearch,
        },
      })
      
      await performSearchWithParams({ keyword: 'test' })
      
      expect(mockSearch).toHaveBeenCalled()
    })
  })

  describe('storeLoading', () => {
    it('exposes store loading state', () => {
      mockStore.loading = computed(() => true)
      
      const { storeLoading } = usePaginationSearch({
        store: mockStore,
      })
      
      expect(storeLoading.value).toBe(true)
    })

    it('handles loading as boolean', () => {
      mockStore.loading = true as unknown as ReturnType<typeof computed>
      
      const { storeLoading } = usePaginationSearch({
        store: mockStore,
      })
      
      expect(storeLoading.value).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles store with getter functions', async () => {
      const mockStoreWithGetters = {
        getList: vi.fn().mockResolvedValue({ count: 0, results: [] }),
        pagination: {
          page: { get: () => 1, set: vi.fn() },
          page_size: { get: () => 20, set: vi.fn() },
          total: { get: () => 0, set: vi.fn() },
        },
        list: () => [],
        loading: () => false,
      }
      
      const { currentPage, pageSize } = usePaginationSearch({
        store: mockStoreWithGetters,
      })
      
      expect(currentPage.value).toBe(1)
      expect(pageSize.value).toBe(20)
    })

    it('handles store with plain values', () => {
      const mockStoreWithPlain = {
        getList: vi.fn().mockResolvedValue({ count: 0, results: [] }),
        pagination: {
          page: 1,
          page_size: 20,
          total: 0,
        },
        list: [],
        loading: false,
      }
      
      const { currentPage, pageSize } = usePaginationSearch({
        store: mockStoreWithPlain,
      })
      
      expect(currentPage.value).toBe(1)
      expect(pageSize.value).toBe(20)
    })
  })
})