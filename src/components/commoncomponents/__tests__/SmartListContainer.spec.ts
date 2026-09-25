import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SmartListContainer from '../SmartListContainer.vue'

const hoisted = vi.hoisted(() => ({
  getList: vi.fn(async () => ({ count: 0, results: [] })),
  handleSizeChange: vi.fn(),
  handleCurrentChange: vi.fn(),
  performSearch: vi.fn(async () => {}),
  performSearchWithParams: vi.fn(async () => {}),
  refreshCurrentPage: vi.fn(async () => {}),
  resetToFirstPage: vi.fn(async () => {}),
  messageError: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}))

vi.mock('@/composables/usePaginationSearch', async () => {
  const { ref } = await import('vue')
  return {
    usePaginationSearch: () => ({
      currentPage: ref(2),
      pageSize: ref(50),
      search: ref('keyword'),
      searchParams: ref({ code: 'C-1' }),
      total: ref(42),
      isSearching: ref(false),
      tableData: ref([{ id: 1 }]),
      storeLoading: ref(false),
      pageSizeOptions: [20, 50, 100],
      handleSizeChange: hoisted.handleSizeChange,
      handleCurrentChange: hoisted.handleCurrentChange,
      performSearch: hoisted.performSearch,
      performSearchWithParams: hoisted.performSearchWithParams,
      refreshCurrentPage: hoisted.refreshCurrentPage,
      resetToFirstPage: hoisted.resetToFirstPage,
    }),
  }
})

vi.mock('element-plus', () => ({
  ElMessage: { error: hoisted.messageError },
}))

vi.mock('@/utils/logger', () => ({
  logError: hoisted.logError,
  logWarn: hoisted.logWarn,
}))

const createStoreConfig = (overrides: Record<string, unknown> = {}) => ({
  store: { getList: hoisted.getList },
  defaultPageSize: 50,
  messages: { loadFailed: '自定义加载失败' },
  ...overrides,
})

const mountContainer = (props: Record<string, unknown>, slots?: Record<string, unknown>) =>
  mount(SmartListContainer, {
    props: { storeConfig: createStoreConfig(), ...props },
    slots: slots as never,
  })

describe('SmartListContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.getList.mockResolvedValue({ count: 0, results: [] })
  })

  describe('automatic loading', () => {
    it('loads the first page on mount using initialPage and defaultPageSize', async () => {
      mountContainer({})
      await vi.waitFor(() => expect(hoisted.getList).toHaveBeenCalledTimes(1))

      expect(hoisted.getList).toHaveBeenCalledWith({ page: 1, page_size: 50 })
    })

    it('prefers initialPageSize over storeConfig.defaultPageSize', async () => {
      mountContainer({ initialPage: 3, initialPageSize: 99 })
      await vi.waitFor(() => expect(hoisted.getList).toHaveBeenCalledTimes(1))

      expect(hoisted.getList).toHaveBeenCalledWith({ page: 3, page_size: 99 })
    })

    it('falls back to 20 when neither initialPageSize nor defaultPageSize is set', async () => {
      mountContainer({ storeConfig: { store: { getList: hoisted.getList } } })
      await vi.waitFor(() => expect(hoisted.getList).toHaveBeenCalledTimes(1))

      expect(hoisted.getList).toHaveBeenCalledWith({ page: 1, page_size: 20 })
    })

    it('does not load when autoLoad is false', async () => {
      mountContainer({ autoLoad: false })
      await Promise.resolve()

      expect(hoisted.getList).not.toHaveBeenCalled()
    })

    it('reports load failures through ElMessage and the logger', async () => {
      const failure = new Error('network down')
      hoisted.getList.mockRejectedValueOnce(failure)
      mountContainer({})
      await vi.waitFor(() => expect(hoisted.messageError).toHaveBeenCalledTimes(1))

      expect(hoisted.messageError).toHaveBeenCalledWith('自定义加载失败')
      expect(hoisted.logError).toHaveBeenCalledWith(
        'components/commoncomponents/SmartListContainer',
        '[SmartListContainer] 初始加载失败:',
        failure,
      )
    })

    it('falls back to a generic message when storeConfig.messages is absent', async () => {
      hoisted.getList.mockRejectedValueOnce(new Error('boom'))
      mountContainer({ storeConfig: { store: { getList: hoisted.getList } } })
      await vi.waitFor(() => expect(hoisted.messageError).toHaveBeenCalledTimes(1))

      expect(hoisted.messageError).toHaveBeenCalledWith('加载数据失败')
    })
  })

  describe('default slot contract', () => {
    const captureSlotProps = async (props: Record<string, unknown> = {}) => {
      let captured: Record<string, unknown> = {}
      const wrapper = mountContainer(props, {
        default: (slotProps: Record<string, unknown>) => {
          captured = slotProps
          return 'slot-content'
        },
      })
      await wrapper.vm.$nextTick()
      return captured
    }

    it('exposes pagination, search and selection state to the default slot', async () => {
      const slotProps = await captureSlotProps()

      expect(slotProps.data).toEqual([{ id: 1 }])
      expect(slotProps.currentPage).toBe(2)
      expect(slotProps.pageSize).toBe(50)
      expect(slotProps.total).toBe(42)
      expect(slotProps.search).toBe('keyword')
      expect(slotProps.searchParams).toEqual({ code: 'C-1' })
      expect(slotProps.isSearching).toBe(false)
      expect(slotProps.loading).toBe(false)
      expect(slotProps.pageSizeOptions).toEqual([20, 50, 100])
      expect(slotProps.selectedRows).toEqual([])
    })

    it('provides callable handlers for search, pagination and selection', async () => {
      const slotProps = await captureSlotProps()

      for (const name of [
        'handleSizeChange',
        'handleCurrentChange',
        'performSearch',
        'performSearchWithParams',
        'refresh',
        'reset',
        'handleSelectionChange',
        'clearSelection',
      ]) {
        expect(typeof slotProps[name]).toBe('function')
      }
    })

    it('tracks selected rows and clears them', async () => {
      let captured: Record<string, unknown> = {}
      mountContainer(
        {},
        {
          default: (slotProps: Record<string, unknown>) => {
            captured = slotProps
            return 'slot-content'
          },
        },
      )
      await Promise.resolve()

      const handleSelectionChange = captured.handleSelectionChange as (rows: object[]) => void
      handleSelectionChange([{ id: 5 }])
      await Promise.resolve()
      expect(captured.selectedRows).toEqual([{ id: 5 }])

      const clearSelection = captured.clearSelection as () => void
      clearSelection()
      await Promise.resolve()
      expect(captured.selectedRows).toEqual([])
    })
  })

  describe('slot forwarding', () => {
    it('forwards named slots when no default slot is provided', () => {
      const wrapper = mountContainer({}, { code: '<span class="forwarded">code-cell</span>' })

      expect(wrapper.find('.forwarded').exists()).toBe(true)
      expect(wrapper.find('.forwarded').text()).toBe('code-cell')
    })
  })

  describe('exposed API', () => {
    it('delegates refresh, reset, search and searchWithParams to the composable', async () => {
      const wrapper = mountContainer({ autoLoad: false })
      const vm = wrapper.vm as unknown as Record<string, (...args: never[]) => Promise<void>>

      await vm.refresh()
      await vm.reset()
      await vm.search('kw' as never)
      await vm.searchWithParams({ code: 'C-2' } as never)

      expect(hoisted.refreshCurrentPage).toHaveBeenCalledTimes(1)
      expect(hoisted.resetToFirstPage).toHaveBeenCalledTimes(1)
      expect(hoisted.performSearch).toHaveBeenCalledWith('kw')
      expect(hoisted.performSearchWithParams).toHaveBeenCalledWith({ code: 'C-2' })
    })

    it('exposes reactive pagination refs, data and clearSelection', () => {
      const wrapper = mountContainer({ autoLoad: false })
      const vm = wrapper.vm as unknown as Record<string, unknown>

      expect(vm.currentPage).toBe(2)
      expect(vm.pageSize).toBe(50)
      expect(vm.data).toEqual([{ id: 1 }])
      expect(typeof vm.clearSelection).toBe('function')

      const clearSelection = vm.clearSelection as () => void
      clearSelection()
      expect(hoisted.getList).not.toHaveBeenCalled()
    })
  })
})
