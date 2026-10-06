import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const {
  mockGetList,
  mockSearchAssets,
  mockCombineSearch,
  mockSetRefreshFlag,
  mockGetAssetTypes,
  mockGetStorages,
  mockLogError,
} = vi.hoisted(() => ({
  mockGetList: vi.fn(),
  mockSearchAssets: vi.fn(),
  mockCombineSearch: vi.fn(),
  mockSetRefreshFlag: vi.fn(),
  mockGetAssetTypes: vi.fn(),
  mockGetStorages: vi.fn(),
  mockLogError: vi.fn(),
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
  assetCurrentStatusMapping: { in_store: '在库', in_use: '在用' },
}))

vi.mock('@/api/assetType', () => ({
  assetTypeAPI: {
    getAssetTypes: mockGetAssetTypes,
  },
}))

vi.mock('@/api/storage', () => ({
  storageAPI: {
    getStorages: mockGetStorages,
  },
}))

vi.mock('@/utils/logger', () => ({
  logError: mockLogError,
}))

import { useAssetListConfig } from '../useAssetListConfig'

describe('useAssetListConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.pagination = { page: 1, page_size: 20, total: 0 }
  })

  it('searchFields 包含 8 个字段，资产分类为动态加载的 select，状态为映射 select', async () => {
    mockGetAssetTypes.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        { type_code: 'AT_W2', type_name: '笔记本' },
        { type_code: 'AT_W3', type_name: '台式机' },
      ],
    })
    const config = useAssetListConfig()
    const searchFields = config.searchFields.value

    expect(searchFields).toHaveLength(8)
    const typeSelect = searchFields.find((f) => f.key === 'asset_type_category')
    expect(typeSelect?.type).toBe('select')
    // 【A-9】初始为空，动态拉取 AssetType 后填充（type_name → label，type_code → value）
    expect(typeSelect?.options).toEqual([])
    await config.loadAssetTypeOptions()
    expect(mockGetAssetTypes).toHaveBeenCalledWith({ page: 1, page_size: 100 })
    // computed 在选项更新后重建数组，需重新取值断言
    const typeSelectAfterLoad = config.searchFields.value.find(
      (f) => f.key === 'asset_type_category',
    )
    expect(typeSelectAfterLoad?.options).toEqual([
      { label: '笔记本', value: 'AT_W2' },
      { label: '台式机', value: 'AT_W3' },
    ])

    const statusSelect = searchFields.find((f) => f.key === 'asset_current_status')
    expect(statusSelect?.options).toEqual([
      { label: '在库', value: 'in_store' },
      { label: '在用', value: 'in_use' },
    ])
  })

  it('loadAssetTypeOptions 拉取失败时保持空选项（不影响主流程）', async () => {
    mockGetAssetTypes.mockRejectedValue(new Error('network'))
    const config = useAssetListConfig()

    await config.loadAssetTypeOptions()

    const typeSelect = config.searchFields.value.find((f) => f.key === 'asset_type_category')
    expect(typeSelect?.options).toEqual([])
  })

  it('loadAssetTypeOptions 在 count 超过单页返回条数时告警截断', async () => {
    mockGetAssetTypes.mockResolvedValue({
      count: 150,
      next: 'next-page-url',
      previous: null,
      results: [
        { type_code: 'AT_W2', type_name: '笔记本' },
        { type_code: 'AT_W3', type_name: '台式机' },
      ],
    })
    const config = useAssetListConfig()

    await config.loadAssetTypeOptions()

    expect(mockLogError).toHaveBeenCalledWith(
      'composables/useAssetSearchOptions',
      '资产类型共 150 条，超过单页返回上限，分类下拉仅展示前 2 条',
    )
    const typeSelect = config.searchFields.value.find((f) => f.key === 'asset_type_category')
    expect(typeSelect?.options).toEqual([
      { label: '笔记本', value: 'AT_W2' },
      { label: '台式机', value: 'AT_W3' },
    ])
  })

  it('loadAssetTypeOptions 在未发生截断时不告警', async () => {
    mockGetAssetTypes.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        { type_code: 'AT_W2', type_name: '笔记本' },
        { type_code: 'AT_W3', type_name: '台式机' },
      ],
    })
    const config = useAssetListConfig()

    await config.loadAssetTypeOptions()

    expect(mockLogError).not.toHaveBeenCalled()
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
    // 【A-9】分类列取 asset_type_name（AssetListSerializer 反规范输出）
    expect(exportColumns.find((c) => c.key === 'asset_type_name')?.title).toBe('资产分类')
  })

  // ===== 【B 批】分组筛选字段集 =====
  describe('groupedSearchFields（分组模式 9 项）', () => {
    /** 携带 recordcode 的资产类型响应（平铺 / 分组两侧值空间同源） */
    const ASSET_TYPES = [
      { type_code: 'AT_W2', type_name: '笔记本', recordcode: 'ASSETTYPE-001' },
      { type_code: 'AT_W3', type_name: '台式机', recordcode: 'ASSETTYPE-002' },
      // 故意缺 recordcode：不应产出 value=undefined 的分组下拉项
      { type_code: 'AT_W4', type_name: '投影仪' },
    ]

    it('字段集为 9 项：平铺 8 项剔除分类键后 + 类型 recordcode + 仓库', async () => {
      mockGetAssetTypes.mockResolvedValue(pagedOf(ASSET_TYPES))
      mockGetStorages.mockResolvedValue(
        pagedOf([{ recordcode: 'STORAGE-001', storage_name: '主仓库' }]),
      )
      const config = useAssetListConfig()
      await config.loadAssetTypeOptions()
      await config.loadStorageOptions()

      const keys = config.groupedSearchFields.value.map((f) => f.key)
      expect(keys).toHaveLength(9)
      expect(keys).not.toContain('asset_type_category')
      expect(keys).toContain('asset_type_recordcode')
      expect(keys).toContain('asset_storage_recordcode')
      // 平铺口径保持 8 项零变化（回归）
      expect(config.searchFields.value.map((f) => f.key)).toHaveLength(8)
      expect(config.searchFields.value.map((f) => f.key)).toContain('asset_type_category')
    })

    it('同一次类型拉取派生两种值空间：分类取 type_code、分组取 recordcode', async () => {
      mockGetAssetTypes.mockResolvedValue(pagedOf(ASSET_TYPES))
      const config = useAssetListConfig()

      await config.loadAssetTypeOptions()

      expect(mockGetAssetTypes).toHaveBeenCalledTimes(1)
      const typeCategory = config.searchFields.value.find((f) => f.key === 'asset_type_category')
      expect(typeCategory?.options).toEqual([
        { label: '笔记本', value: 'AT_W2' },
        { label: '台式机', value: 'AT_W3' },
        { label: '投影仪', value: 'AT_W4' },
      ])
      const typeRecordcode = config.groupedSearchFields.value.find(
        (f) => f.key === 'asset_type_recordcode',
      )
      // 缺 recordcode 的条目被剔除：value=undefined 的选项会让 el-select 匹配失效
      expect(typeRecordcode?.options).toEqual([
        { label: '笔记本', value: 'ASSETTYPE-001' },
        { label: '台式机', value: 'ASSETTYPE-002' },
      ])
    })

    it('仓库下拉 value 取 Storage.recordcode（非 storage_code，后端 FK to_field 口径）', async () => {
      mockGetStorages.mockResolvedValue(
        pagedOf([
          { recordcode: 'STORAGE-001', storage_code: 'WH-1', storage_name: '主仓库' },
          { recordcode: 'STORAGE-002', storage_code: 'WH-2', storage_name: '分仓库' },
        ]),
      )
      const config = useAssetListConfig()

      await config.loadStorageOptions()

      expect(mockGetStorages).toHaveBeenCalledWith({ page: 1, page_size: 100 })
      const storageSelect = config.groupedSearchFields.value.find(
        (f) => f.key === 'asset_storage_recordcode',
      )
      expect(storageSelect?.options).toEqual([
        { label: '主仓库', value: 'STORAGE-001' },
        { label: '分仓库', value: 'STORAGE-002' },
      ])
    })

    it('仓库选项截断时告警（单页上限 100）', async () => {
      mockGetStorages.mockResolvedValue({ ...pagedOf([]), count: 150, results: [] })
      const config = useAssetListConfig()

      await config.loadStorageOptions()

      expect(mockLogError).toHaveBeenCalledWith(
        'composables/useAssetSearchOptions',
        '仓库共 150 条，超过单页返回上限，仓库下拉仅展示前 0 条',
      )
    })

    it('仓库选项拉取失败时保持空选项（不影响列表主流程）', async () => {
      mockGetStorages.mockRejectedValue(new Error('network'))
      const config = useAssetListConfig()

      await config.loadStorageOptions()

      const storageSelect = config.groupedSearchFields.value.find(
        (f) => f.key === 'asset_storage_recordcode',
      )
      expect(storageSelect?.options).toEqual([])
      expect(mockLogError).not.toHaveBeenCalled()
    })

    it('仓库选项仅在 enableGrouping=true 时随 onMounted 自动加载', async () => {
      mockGetAssetTypes.mockResolvedValue(pagedOf(ASSET_TYPES))
      mockGetStorages.mockResolvedValue(pagedOf([]))

      mountHost()
      await flushPromises()
      expect(mockGetAssetTypes).toHaveBeenCalledTimes(1)
      expect(mockGetStorages).not.toHaveBeenCalled()

      mockGetStorages.mockClear()
      mockGetAssetTypes.mockClear()
      mountHost({ enableGrouping: true })
      await flushPromises()
      expect(mockGetAssetTypes).toHaveBeenCalledTimes(1)
      expect(mockGetStorages).toHaveBeenCalledTimes(1)
    })
  })
})

/** 单页响应信封（仅本文件的 B 批用例使用） */
function pagedOf(results: unknown[]) {
  return {
    count: results.length,
    next: null,
    previous: null,
    results,
    total_pages: 1,
    page: 1,
    page_size: 100,
  }
}

/** 挂载一个只调用 composable 的宿主组件，使 onMounted 真正执行 */
function mountHost(options: Parameters<typeof useAssetListConfig>[0] = {}) {
  return mount({
    setup() {
      useAssetListConfig(options)
      return () => null
    },
  })
}
