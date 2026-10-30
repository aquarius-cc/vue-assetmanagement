// TECHNICAL_DEBT: >500 lines（存量文件，2026-07-07 基线前已超限；本次修改新增 <50 行，暂不拆分）
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
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

      expect(pageSizeOptions).toEqual([20, 50, 100])
    })

    it('[M-23] getter 就近吸附：URL/残留态携带已下线档位 500 → 归一化为 100', () => {
      mockStore.pagination.page_size = 500
      const { pageSize } = usePaginationSearch({ store: mockStore })
      expect(pageSize.value).toBe(100)
    })

    it('[M-23] getter 就近吸附：非法档位 40 → 向下吸附 20', () => {
      mockStore.pagination.page_size = 40
      const { pageSize } = usePaginationSearch({ store: mockStore })
      expect(pageSize.value).toBe(20)
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

  // BF-047：当前搜索词的单一事实来源（供导出等消费方读取）
  describe('onSearchStateChange', () => {
    const setupWithNotifier = (onSearchStateChange = vi.fn()) => {
      const mockSearch = vi.fn().mockResolvedValue({ count: 1, results: [{ id: 1 }] })
      const instance = usePaginationSearch({
        store: mockStore,
        search: { performSearch: mockSearch, onSearchStateChange },
      })
      return { ...instance, onSearchStateChange }
    }

    it('搜索时上报当前搜索词', async () => {
      const { performSearch, onSearchStateChange } = setupWithNotifier()

      await performSearch('张三')

      expect(onSearchStateChange).toHaveBeenCalledWith('张三')
    })

    it('清空搜索（空串）时上报空串，使消费方回到全量口径', async () => {
      const { performSearch, onSearchStateChange } = setupWithNotifier()

      await performSearch('张三')
      await performSearch('')

      expect(onSearchStateChange).toHaveBeenLastCalledWith('')
    })

    it('reset 清空搜索态时同样上报空串', async () => {
      const { performSearch, resetToFirstPage, onSearchStateChange } = setupWithNotifier()

      await performSearch('张三')
      await resetToFirstPage()

      expect(onSearchStateChange).toHaveBeenLastCalledWith('')
    })

    it('未配置回调时不报错（向后兼容）', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ count: 0, results: [] })
      const { performSearch } = usePaginationSearch({
        store: mockStore,
        search: { performSearch: mockSearch },
      })

      await expect(performSearch('test')).resolves.not.toThrow()
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
    it('resets page to 1, clears search, and reloads first page [I-2]', async () => {
      const { resetToFirstPage, currentPage, search } = usePaginationSearch({
        store: mockStore,
      })

      currentPage.value = 5
      search.value = 'test'

      await resetToFirstPage()

      expect(currentPage.value).toBe(1)
      expect(search.value).toBe('')
      expect(mockStore.getList).toHaveBeenCalledWith({ page: 1, page_size: 20 })
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

    /**
     * D1 回归：未实现 performSearchWithParams 时，**禁止**把任意筛选值当搜索词。
     *
     * 旧实现 `params.keyword || Object.values(params).find(非空)` 会把
     * `department_code` 当 keyword 发给搜索端点，而后端 keyword 匹配员工昵称，
     * 结果集必然错误且无任何提示。
     */
    it('非关键字筛选不得被当成搜索词，回落为列表加载', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ count: 0, results: [] })

      const { performSearchWithParams, searchParams } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: mockSearch,
        },
      })

      await performSearchWithParams({ department_code: 'DEPT-F1' })

      expect(mockSearch).not.toHaveBeenCalled()
      expect(mockStore.getList).toHaveBeenCalledWith({ page: 1, page_size: 20 })
      expect(searchParams.value).toEqual({})
    })

    it('keyword 与筛选并存时只取 keyword 作为搜索词', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ count: 0, results: [] })

      const { performSearchWithParams } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: mockSearch,
        },
      })

      await performSearchWithParams({ keyword: '张三', department_code: 'DEPT-F1' })

      expect(mockSearch).toHaveBeenCalledWith('张三', 1, 20)
    })

    it('keyword 仅空白时同样回落为列表，不拿其他筛选值凑数', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ count: 0, results: [] })

      const { performSearchWithParams } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: mockSearch,
        },
      })

      await performSearchWithParams({ keyword: '   ', status: 'active' })

      expect(mockSearch).not.toHaveBeenCalled()
      expect(mockStore.getList).toHaveBeenCalledWith({ page: 1, page_size: 20 })
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

  describe('branch coverage', () => {
    it('skips total update when response lacks count', async () => {
      mockStore.getList.mockResolvedValue({ results: [] })

      const { loadList, total } = usePaginationSearch({ store: mockStore })

      await loadList(1, 20)

      expect(total.value).toBe(0)
    })

    it('always resets current page to 1 on size change [M-3]', async () => {
      mockStore.pagination.total = ref(20)

      const { handleSizeChange, currentPage } = usePaginationSearch({ store: mockStore })

      currentPage.value = 5
      await handleSizeChange(50)

      expect(currentPage.value).toBe(1)
    })

    it('re-searches when size changes with active search', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ count: 0, results: [] })

      const { handleSizeChange, search } = usePaginationSearch({
        store: mockStore,
        search: { performSearch: mockSearch },
      })

      search.value = 'kw'
      await handleSizeChange(50)

      expect(mockSearch).toHaveBeenCalled()
    })

    it('warns and clamps page when search result page exceeds range', async () => {
      const mockSearch = vi.fn().mockResolvedValue({ count: 2, results: [{ id: 1 }] })

      const { handleCurrentChange, search } = usePaginationSearch({
        store: mockStore,
        search: { performSearch: mockSearch },
      })

      search.value = 'kw'
      await handleCurrentChange(3)

      expect((await import('element-plus')).ElMessage.warning).toHaveBeenCalledWith(
        '页码超出范围，已跳转至最后一页（1）',
      )
      expect(mockSearch).toHaveBeenCalledTimes(2)
    })

    it('warns and clamps page when plain list page exceeds range', async () => {
      mockStore.getList.mockResolvedValue({ count: 5, results: [{ id: 1 }] })

      const { handleCurrentChange } = usePaginationSearch({ store: mockStore })

      await handleCurrentChange(3)

      expect((await import('element-plus')).ElMessage.warning).toHaveBeenCalledWith(
        '页码超出范围，已跳转至最后一页（1）',
      )
      expect(mockStore.getList).toHaveBeenCalledTimes(2)
    })

    it('returns empty table data while searching', () => {
      const mockSearch = vi.fn().mockReturnValue(new Promise(() => {}))

      const { performSearch, tableData } = usePaginationSearch({
        store: mockStore,
        search: { performSearch: mockSearch },
      })

      performSearch('kw')

      expect(tableData.value).toEqual([])
    })

    it('reacts to refreshFlag watch', async () => {
      const { refreshCurrentPage } = usePaginationSearch({ store: mockStore })

      mockStore.refreshFlag!.value = true
      await new Promise((r) => setTimeout(r, 0))

      expect(mockStore.getList).toHaveBeenCalled()
      expect(refreshCurrentPage).toBeDefined()
      expect(mockStore.setRefreshFlag).toHaveBeenCalledWith(false)
    })

    it('does nothing when refreshFlag is set to false', async () => {
      usePaginationSearch({ store: mockStore })

      mockStore.refreshFlag!.value = false
      await new Promise((r) => setTimeout(r, 0))

      expect(mockStore.getList).not.toHaveBeenCalled()
    })

    it('uses custom invalid page message', async () => {
      mockStore.getList.mockResolvedValue({ count: 5, results: [{ id: 1 }] })

      const { handleCurrentChange } = usePaginationSearch({
        store: mockStore,
        messages: { invalidPage: '自定义超范围提示' },
      })

      await handleCurrentChange(3)

      expect((await import('element-plus')).ElMessage.warning).toHaveBeenCalledWith(
        '自定义超范围提示（1）',
      )
    })
  })

  describe('搜索竞态守卫 [I-8]', () => {
    /** 手控 resolve 的 deferred promise 夹具 */
    const deferred = <T>() => {
      let resolve!: (v: T) => void
      let reject!: (e: unknown) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }

    it('慢关键词搜索过期时丢弃结果：不覆盖新搜索数据', async () => {
      const slow = deferred<{ count: number; results: { id: number }[] }>()
      const fast = deferred<{ count: number; results: { id: number }[] }>()
      const mockSearch = vi.fn().mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

      const { performSearch, searchResults, isSearching } = usePaginationSearch({
        store: mockStore,
        search: { performSearch: mockSearch },
      })

      // A（慢）先发起，B（快）后发起
      const promiseA = performSearch('AAA')
      const promiseB = performSearch('BBB')

      // B 先 resolve
      fast.resolve({ count: 1, results: [{ id: 2 }] })
      await promiseB
      expect(searchResults.value).toEqual([{ id: 2 }])

      // A 后 resolve：应被丢弃
      slow.resolve({ count: 1, results: [{ id: 1 }] })
      await promiseA
      expect(searchResults.value).toEqual([{ id: 2 }])
      expect(isSearching.value).toBe(false)
    })

    it('慢搜索失败时不清空新搜索结果', async () => {
      const slow = deferred<{ count: number; results: { id: number }[] }>()
      const fast = deferred<{ count: number; results: { id: number }[] }>()
      const mockSearch = vi.fn().mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

      const { performSearch, searchResults } = usePaginationSearch({
        store: mockStore,
        search: { performSearch: mockSearch },
      })

      const promiseA = performSearch('AAA')
      const promiseB = performSearch('BBB')

      fast.resolve({ count: 1, results: [{ id: 2 }] })
      await promiseB
      expect(searchResults.value).toEqual([{ id: 2 }])

      // A 后 reject：不得清空 B 的结果，仍应 rethrow
      slow.reject(new Error('A failed'))
      await expect(promiseA).rejects.toThrow('A failed')
      expect(searchResults.value).toEqual([{ id: 2 }])
    })

    it('慢参数搜索过期时丢弃结果：不覆盖新搜索数据', async () => {
      const slow = deferred<{ count: number; results: { id: number }[] }>()
      const fast = deferred<{ count: number; results: { id: number }[] }>()
      const mockWithParams = vi
        .fn()
        .mockReturnValueOnce(slow.promise)
        .mockReturnValueOnce(fast.promise)

      const { performSearchWithParams, searchResults } = usePaginationSearch({
        store: mockStore,
        search: { performSearch: vi.fn(), performSearchWithParams: mockWithParams },
      })

      const promiseA = performSearchWithParams({ status: 'in_store' })
      const promiseB = performSearchWithParams({ status: 'in_use' })

      fast.resolve({ count: 1, results: [{ id: 2 }] })
      await promiseB
      expect(searchResults.value).toEqual([{ id: 2 }])

      slow.resolve({ count: 1, results: [{ id: 1 }] })
      await promiseA
      expect(searchResults.value).toEqual([{ id: 2 }])
    })

    it('新请求在途时慢请求 finally 不复位 isSearching', async () => {
      const slow = deferred<{ count: number; results: { id: number }[] }>()
      const fast = deferred<{ count: number; results: { id: number }[] }>()
      const mockSearch = vi.fn().mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)

      const { performSearch, isSearching } = usePaginationSearch({
        store: mockStore,
        search: { performSearch: mockSearch },
      })

      const promiseA = performSearch('AAA')
      const promiseB = performSearch('BBB')

      // A 先完成（过期），此时 B 仍在途：isSearching 不得被 A 复位为 false
      slow.resolve({ count: 0, results: [] })
      await promiseA
      expect(isSearching.value).toBe(true)

      // B 完成后才复位
      fast.resolve({ count: 0, results: [] })
      await promiseB
      expect(isSearching.value).toBe(false)
    })
  })

  describe('EP 事件入口吞错 [M-37]', () => {
    it('handleCurrentChange 吞掉失败不产生 unhandled rejection，提示仍由内层发出', async () => {
      mockStore.getList.mockRejectedValue(new Error('boom'))

      const { handleCurrentChange } = usePaginationSearch({ store: mockStore })
      await expect(handleCurrentChange(2)).resolves.toBeUndefined() // 修复前 rejects → 红
      expect(vi.mocked(ElMessage.error)).toHaveBeenCalledWith('加载数据失败')
    })

    it('handleSizeChange 吞掉失败', async () => {
      mockStore.getList.mockRejectedValue(new Error('boom'))

      const { handleSizeChange } = usePaginationSearch({ store: mockStore })
      await expect(handleSizeChange(50)).resolves.toBeUndefined() // 修复前 rejects → 红
    })

    it('refreshCurrentPage 吞掉失败', async () => {
      mockStore.getList.mockRejectedValue(new Error('boom'))

      const { refreshCurrentPage } = usePaginationSearch({ store: mockStore })
      await expect(refreshCurrentPage()).resolves.toBeUndefined() // 修复前 rejects → 红
    })

    it('searchWithReset 吞掉 performSearchWithParams 失败', async () => {
      const { searchWithReset } = usePaginationSearch({
        store: mockStore,
        search: {
          performSearch: vi.fn(),
          performSearchWithParams: vi.fn().mockRejectedValue(new Error('boom')),
        },
      })
      await expect(searchWithReset({ status: 'in_use' })).resolves.toBeUndefined() // 修复前 rejects → 红
    })
  })
})
