import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetList, mockSearchAssets, mockCombineSearch, mockSetRefreshFlag } = vi.hoisted(() => ({
  mockGetList: vi.fn(),
  mockSearchAssets: vi.fn(),
  mockCombineSearch: vi.fn(),
  mockSetRefreshFlag: vi.fn(),
}))

const mockStore = {
  getList: mockGetList,
  searchAssets: mockSearchAssets,
  combineSearch: mockCombineSearch,
  pagination: { page: 1, page_size: 20, total: 0 },
  list: [],
  loading: false,
  refreshFlag: false,
  setRefreshFlag: mockSetRefreshFlag,
}

vi.mock('@/stores/assetStore', () => ({
  useAssetStore: () => mockStore,
}))

vi.mock('@/utils/Format', () => ({
  assetTypeMapping: { laptop: '笔记本', desktop: '台式机' },
  assetCurrentStatusMapping: { in_store: '在库', in_use: '在用' },
}))

import { useAssetListConfig } from '../useAssetListConfig'

describe('useAssetListConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.pagination = { page: 1, page_size: 20, total: 0 }
  })

  it('searchFields 包含 8 个字段并将映射转为 select options', () => {
    const { searchFields } = useAssetListConfig()

    expect(searchFields).toHaveLength(8)
    const typeSelect = searchFields.find((f) => f.key === 'asset_type_category')
    expect(typeSelect?.type).toBe('select')
    expect(typeSelect?.options).toEqual([
      { label: '笔记本', value: 'laptop' },
      { label: '台式机', value: 'desktop' },
    ])

    const statusSelect = searchFields.find((f) => f.key === 'asset_current_status')
    expect(statusSelect?.options).toEqual([
      { label: '在库', value: 'in_store' },
      { label: '在用', value: 'in_use' },
    ])
  })

  it('storeConfig.store.getList 委托 assetStore 并返回分页结构', async () => {
    mockGetList.mockResolvedValue([{ asset_code: 'A001' }])
    mockStore.pagination.total = 42
    const { storeConfig } = useAssetListConfig()

    const result = await storeConfig.store.getList({ page: 1, page_size: 20 })

    expect(mockGetList).toHaveBeenCalledWith({ page: 1, page_size: 20 })
    expect(result).toEqual({
      count: 42,
      results: [{ asset_code: 'A001' }],
      next: null,
      previous: null,
    })
  })

  it('分页 getter/setter 与会 computed 转发到 assetStore', () => {
    const { storeConfig } = useAssetListConfig()
    mockStore.pagination.page = 4
    mockStore.pagination.page_size = 20
    mockStore.pagination.total = 10
    mockStore.list = [{ asset_code: 'A001' }]
    mockStore.loading = true
    mockStore.refreshFlag = true

    expect(storeConfig.store.pagination.page.get()).toBe(4)
    expect(storeConfig.store.pagination.page_size.get()).toBe(20)
    expect(storeConfig.store.pagination.total.get()).toBe(10)
    expect(storeConfig.store.list.value).toEqual([{ asset_code: 'A001' }])
    expect(storeConfig.store.loading.value).toBe(true)
    expect(storeConfig.store.refreshFlag.value).toBe(true)

    storeConfig.store.pagination.page.set(5)
    storeConfig.store.setRefreshFlag(true)
    expect(mockStore.pagination.page).toBe(5)
    expect(mockSetRefreshFlag).toHaveBeenCalledWith(true)
  })

  it('performSearch 调用 searchAssets 并映射响应', async () => {
    mockSearchAssets.mockResolvedValue({ count: 3, results: [{ asset_code: 'A001' }] })
    const { storeConfig } = useAssetListConfig()

    const result = await storeConfig.search.performSearch('资产', 2, 20)

    expect(mockSearchAssets).toHaveBeenCalledWith({ keyword: '资产', page: 2, page_size: 20 })
    expect(result).toEqual({ count: 3, results: [{ asset_code: 'A001' }] })
  })

  it('performSearchWithParams 调用 combineSearch 合并参数', async () => {
    mockCombineSearch.mockResolvedValue({ count: 1, results: [{ asset_code: 'B002' }] })
    const { storeConfig } = useAssetListConfig()

    const result = await storeConfig.search.performSearchWithParams?.(
      { asset_type: 'laptop' },
      1,
      20,
    )

    expect(mockCombineSearch).toHaveBeenCalledWith({ asset_type: 'laptop', page: 1, page_size: 20 })
    expect(result).toEqual({ count: 1, results: [{ asset_code: 'B002' }] })
  })

  it('defaultPageSize 为 20 且 messages 完整', () => {
    const { storeConfig } = useAssetListConfig()

    expect(storeConfig.defaultPageSize).toBe(20)
    expect(storeConfig.messages).toEqual({
      loadFailed: '加载资产列表失败',
      searchFailed: '搜索资产失败',
      invalidPage: '页码超出范围，已跳转至最后一页',
    })
  })

  it('exportColumns 包含 19 列且单价列带 formatter', () => {
    const { exportColumns } = useAssetListConfig()

    expect(exportColumns).toHaveLength(19)
    const priceColumn = exportColumns.find((c) => c.key === 'asset_purchase_price')
    expect(priceColumn?.formatter?.(null)).toBe('0')
    expect(priceColumn?.formatter?.(123)).toBe('123')
  })
})
