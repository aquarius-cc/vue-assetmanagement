import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed } from 'vue'
import { usePaginationSearch } from '../usePaginationSearch'

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('usePaginationSearch 搜索态路由（BF-083）', () => {
  let mockStore: {
    getList: ReturnType<typeof vi.fn>
    pagination: { page: ReturnType<typeof vi.fn>; page_size: ReturnType<typeof vi.fn> }
    list: ReturnType<typeof vi.fn>
    loading: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStore = {
      getList: vi.fn().mockResolvedValue({ count: 0, results: [] }),
      pagination: {
        page: ref(1),
        page_size: ref(20),
      },
      list: computed(() => []),
      loading: computed(() => false),
    }
  })

  it('参数态 refresh 走 performSearchWithParams 而非 loadList', async () => {
    const mockWithParams = vi.fn().mockResolvedValue({ count: 0, results: [] })

    const { performSearchWithParams, refreshCurrentPage } = usePaginationSearch({
      store: mockStore,
      search: { performSearch: vi.fn(), performSearchWithParams: mockWithParams },
    })

    await performSearchWithParams({ status: 'in_store' })
    mockWithParams.mockClear()

    await refreshCurrentPage()

    expect(mockWithParams).toHaveBeenCalledWith({ status: 'in_store' }, 1, 20)
    expect(mockStore.getList).not.toHaveBeenCalled()
  })

  it('参数态翻页走 performSearchWithParams 并用钳制后页码', async () => {
    const mockWithParams = vi.fn().mockResolvedValue({ count: 0, results: [] })

    const { performSearchWithParams, handleCurrentChange } = usePaginationSearch({
      store: mockStore,
      search: { performSearch: vi.fn(), performSearchWithParams: mockWithParams },
    })

    await performSearchWithParams({ status: 'in_store' })
    mockWithParams.mockClear()

    await handleCurrentChange(2)

    expect(mockWithParams).toHaveBeenCalledWith({ status: 'in_store' }, 2, 20)
    expect(mockStore.getList).not.toHaveBeenCalled()
  })

  it('参数态改页长走 performSearchWithParams 并用新页长', async () => {
    const mockWithParams = vi.fn().mockResolvedValue({ count: 0, results: [] })

    const { performSearchWithParams, handleSizeChange } = usePaginationSearch({
      store: mockStore,
      search: { performSearch: vi.fn(), performSearchWithParams: mockWithParams },
    })

    await performSearchWithParams({ status: 'in_store' })
    mockWithParams.mockClear()

    await handleSizeChange(50)

    expect(mockWithParams).toHaveBeenCalledWith({ status: 'in_store' }, 1, 50)
    expect(mockStore.getList).not.toHaveBeenCalled()
  })

  it('多字段后关键词接管：入口清参且 refresh 走关键词', async () => {
    const mockWithParams = vi.fn().mockResolvedValue({ count: 0, results: [] })
    const mockKw = vi.fn().mockResolvedValue({ count: 0, results: [] })

    const { performSearchWithParams, performSearch, refreshCurrentPage, searchParams } =
      usePaginationSearch({
        store: mockStore,
        search: { performSearch: mockKw, performSearchWithParams: mockWithParams },
      })

    await performSearchWithParams({ status: 'in_store' })
    await performSearch('DEMO')

    expect(searchParams.value).toEqual({})

    mockWithParams.mockClear()
    mockKw.mockClear()

    await refreshCurrentPage()

    expect(mockKw).toHaveBeenCalledWith('DEMO', 1, 20)
    expect(mockWithParams).not.toHaveBeenCalled()
    expect(mockStore.getList).not.toHaveBeenCalled()
  })

  it('关键词态 refresh 走 performSearch（回归锁）', async () => {
    const mockKw = vi.fn().mockResolvedValue({ count: 0, results: [] })

    const { performSearch, refreshCurrentPage } = usePaginationSearch({
      store: mockStore,
      search: { performSearch: mockKw },
    })

    await performSearch('张三')
    mockKw.mockClear()

    await refreshCurrentPage()

    expect(mockKw).toHaveBeenCalledWith('张三', 1, 20)
    expect(mockStore.getList).not.toHaveBeenCalled()
  })

  it('双空态 refresh 走 loadList（回归锁）', async () => {
    const { refreshCurrentPage } = usePaginationSearch({
      store: mockStore,
      search: { performSearch: vi.fn() },
    })

    await refreshCurrentPage()

    expect(mockStore.getList).toHaveBeenCalledWith({ page: 1, page_size: 20 })
  })
})
