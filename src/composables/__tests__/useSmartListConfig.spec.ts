import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive } from 'vue'
import { useSmartListConfig, type SmartListConfigOptions } from '../useSmartListConfig'

interface TestItem {
  id: number
}

function makeStore() {
  const pagination = reactive({ page: 1, page_size: 20, total: 0 })
  return {
    getList: vi.fn(async () => [] as TestItem[]),
    pagination,
    list: [] as TestItem[],
    loading: false,
    refreshFlag: false,
    setRefreshFlag: vi.fn(),
  }
}

function useConfig(store = makeStore(), overrides: Partial<SmartListConfigOptions<TestItem>> = {}) {
  return {
    store,
    config: useSmartListConfig<TestItem>({ store, entityName: '测试实体', ...overrides }),
  }
}

describe('useSmartListConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('默认配置', () => {
    it('默认每页 20 条', () => {
      const { config } = useConfig()
      expect(config.defaultPageSize).toBe(20)
    })

    it('生成默认消息并允许覆盖', () => {
      const { config } = useConfig(makeStore(), {
        messages: { searchFailed: '自定义搜索失败' },
      })
      expect(config.messages).toEqual({
        loadFailed: '加载测试实体列表失败',
        searchFailed: '自定义搜索失败',
        invalidPage: '页码超出范围，已跳转至最后一页',
      })
    })
  })

  describe('store.getList 包装', () => {
    it('调用 store 的 getList 并返回分页结构', async () => {
      const store = makeStore()
      store.getList.mockResolvedValue([{ id: 1 }])
      store.pagination.total = 5
      const { config } = useConfig(store)

      const result = await config.store.getList({ page: 2, page_size: 20 })

      expect(store.getList).toHaveBeenCalledWith({ page: 2, page_size: 20 })
      expect(result).toEqual({ count: 5, results: [{ id: 1 }], next: null, previous: null })
    })

    it('使用 customGetList 时不再调用 store.getList', async () => {
      const store = makeStore()
      const customGetList = vi.fn(async () => ({ count: 3, results: [{ id: 2 }] }))
      const { config } = useConfig(store, { customGetList })

      const result = await config.store.getList({ page: 1, page_size: 10 })

      expect(store.getList).not.toHaveBeenCalled()
      expect(customGetList).toHaveBeenCalledWith({ page: 1, page_size: 10 })
      expect(result).toEqual({ count: 3, results: [{ id: 2 }], next: null, previous: null })
    })
  })

  describe('分页转发', () => {
    it('分页 getter 读取 store 值', () => {
      const store = makeStore()
      store.pagination.page = 3
      store.pagination.page_size = 50
      store.pagination.total = 100
      const { config } = useConfig(store)

      expect(config.store.pagination.page.get()).toBe(3)
      expect(config.store.pagination.page_size.get()).toBe(50)
      expect(config.store.pagination.total.get()).toBe(100)
    })

    it('分页 setter 写入 store 值', () => {
      const store = makeStore()
      const { config } = useConfig(store)

      config.store.pagination.page.set(4)
      config.store.pagination.page_size.set(30)
      config.store.pagination.total.set(120)

      expect(store.pagination.page).toBe(4)
      expect(store.pagination.page_size).toBe(30)
      expect(store.pagination.total).toBe(120)
    })
  })

  describe('list/loading/refreshFlag 转发', () => {
    it('computed 与 setRefreshFlag 委托给 store', () => {
      const store = makeStore()
      store.list = [{ id: 1 }]
      store.loading = true
      store.refreshFlag = true
      const { config } = useConfig(store)

      expect(config.store.list.value).toEqual([{ id: 1 }])
      expect(config.store.loading.value).toBe(true)
      expect(config.store.refreshFlag.value).toBe(true)

      config.store.setRefreshFlag(false)
      expect(store.setRefreshFlag).toHaveBeenCalledWith(false)
    })
  })

  describe('search.performSearch', () => {
    it('组装搜索参数并返回 count/results', async () => {
      const store = makeStore()
      store.getList.mockResolvedValue([{ id: 9 }])
      store.pagination.total = 6
      const { config } = useConfig(store)

      const result = await config.search.performSearch('关键词', 1, 20)

      expect(store.getList).toHaveBeenCalledWith({ search: '关键词', page: 1, page_size: 20 })
      expect(result).toEqual({ count: 6, results: [{ id: 9 }] })
    })

    it('合并 searchExtraParams', async () => {
      const store = makeStore()
      const { config } = useConfig(store, { searchExtraParams: { asset_type: 'laptop' } })

      await config.search.performSearch('关键词', 1, 20)

      expect(store.getList).toHaveBeenCalledWith({
        search: '关键词',
        page: 1,
        page_size: 20,
        asset_type: 'laptop',
      })
    })

    it('customGetList 模式下走自定义逻辑', async () => {
      const store = makeStore()
      const customGetList = vi.fn(async () => ({ count: 8, results: [{ id: 7 }] }))
      const { config } = useConfig(store, { customGetList })

      const result = await config.search.performSearch('x', 2, 10)

      expect(store.getList).not.toHaveBeenCalled()
      expect(result).toEqual({ count: 8, results: [{ id: 7 }] })
    })
  })
})
