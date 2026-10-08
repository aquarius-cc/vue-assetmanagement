import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetGroupedAssets, mockGetGroupChildren, mockLogError } = vi.hoisted(() => ({
  mockGetGroupedAssets: vi.fn(),
  mockGetGroupChildren: vi.fn(),
  mockLogError: vi.fn(),
}))

vi.mock('@/api/asset', () => ({
  assetAPI: {
    getGroupedAssets: mockGetGroupedAssets,
    getGroupChildren: mockGetGroupChildren,
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}))

vi.mock('@/utils/logger', () => ({
  logError: mockLogError,
}))

import { ElMessage } from 'element-plus'
import { useGroupedAssetList } from '../useGroupedAssetList'
import type { AssetDetail, AssetGroupSummary, PaginatedResponse } from '@/types/asset'

const mockElMessageError = vi.mocked(ElMessage.error)

/** 多资产组（保持折叠的基准组） */
const GROUP_MULTI = '["HT2024-001","笔记本","ThinkPad X1","Lenovo"]'
/** 无合同哨兵组 + 规格/品牌双 null（group_key null 位往返），asset_count 为 1 故亦用于单条组默认折叠断言（BF-078） */
const GROUP_SENTINEL = '[null,"投影仪",null,null]'

function makeSummary(overrides: Partial<AssetGroupSummary> = {}): AssetGroupSummary {
  return {
    group_key: GROUP_MULTI,
    contract_code: 'HT2024-001',
    asset_name: '笔记本',
    asset_specification: 'ThinkPad X1',
    asset_brand: 'Lenovo',
    asset_count: 3,
    price_display: '¥12,000.00',
    asset_codes: ['ZC001', 'ZC002', 'ZC003'],
    ...overrides,
  }
}

function makeDetail(recordcode: string, asset_code: string): AssetDetail {
  return { recordcode, asset_code } as AssetDetail
}

function paged<T>(results: T[], count = results.length, page = 1, pageSize = 20) {
  return {
    count,
    next: null,
    previous: null,
    results,
    total_pages: 1,
    page,
    page_size: pageSize,
  } as PaginatedResponse<T>
}

const SUMMARY_MULTI = makeSummary()
const SUMMARY_SENTINEL = makeSummary({
  group_key: GROUP_SENTINEL,
  contract_code: null,
  asset_name: '投影仪',
  asset_specification: null,
  asset_brand: null,
  asset_count: 1,
  price_display: '¥0.00',
  asset_codes: ['ZC004'],
})

function childrenCallsFor(groupKey: string) {
  return mockGetGroupChildren.mock.calls.filter(([params]) => params.group_key === groupKey)
}

describe('useGroupedAssetList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI], 1))
    mockGetGroupChildren.mockResolvedValue(paged([makeDetail('R1', 'ZC001')], 1))
  })

  describe('initialization', () => {
    it('returns correct initial state', () => {
      const api = useGroupedAssetList()

      expect(api.summaries.value).toEqual([])
      expect(api.summaryTotal.value).toBe(0)
      expect(api.summaryLoading.value).toBe(false)
      expect(api.currentPage.value).toBe(1)
      expect(api.pageSize.value).toBe(20)
      expect(api.childPageSize.value).toBe(20)
      expect(api.expandedKeys.value).toEqual([])
      expect(api.selectedCodes.value).toEqual([])
      expect(api.selectedGroupKeys.value).toEqual([])
    })
  })

  describe('search', () => {
    it('calls getGroupedAssets with filters and pagination', async () => {
      mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI], 1))
      const { search } = useGroupedAssetList()

      await search({ asset_current_status: 'in_store', contract_code: 'HT2024-001' })

      expect(mockGetGroupedAssets).toHaveBeenCalledWith({
        asset_current_status: 'in_store',
        contract_code: 'HT2024-001',
        page: 1,
        page_size: 20,
      })
    })

    it('assigns results and total from response', async () => {
      const { search, summaries, summaryTotal } = useGroupedAssetList()

      await search()

      expect(summaries.value).toEqual([SUMMARY_MULTI])
      expect(summaryTotal.value).toBe(1)
    })

    it('resets to page 1 on new search', async () => {
      const { search, currentPage } = useGroupedAssetList()
      currentPage.value = 5

      await search({ asset_current_status: 'in_use' })

      expect(currentPage.value).toBe(1)
      expect(mockGetGroupedAssets).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
    })

    it('clears children cache and expanded state on filter change', async () => {
      const api = useGroupedAssetList()
      await api.search()
      await api.toggleExpand(GROUP_MULTI)
      expect(api.expandedKeys.value).toEqual([GROUP_MULTI])

      await api.search({ asset_current_status: 'in_use' })

      expect(api.expandedKeys.value).toEqual([])
      expect(api.childrenOf(GROUP_MULTI)).toEqual([])
    })

    it('reports error and clears data when summary request fails', async () => {
      mockGetGroupedAssets.mockRejectedValue(new Error('Network error'))
      const { search, summaries, summaryTotal, summaryLoading } = useGroupedAssetList()

      await search()

      expect(mockElMessageError).toHaveBeenCalledWith('加载资产分组汇总失败')
      expect(summaries.value).toEqual([])
      expect(summaryTotal.value).toBe(0)
      expect(summaryLoading.value).toBe(false)
    })
  })

  describe('changePage', () => {
    it('requests the target page and reuses cached filters', async () => {
      const { search, changePage, currentPage } = useGroupedAssetList()
      await search({ asset_current_status: 'in_use' })
      vi.clearAllMocks()
      mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI], 10))

      await changePage(2)

      expect(currentPage.value).toBe(2)
      expect(mockGetGroupedAssets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, asset_current_status: 'in_use' }),
      )
    })

    it('does nothing when page is unchanged', async () => {
      const { changePage } = useGroupedAssetList()

      await changePage(1)

      expect(mockGetGroupedAssets).not.toHaveBeenCalled()
    })

    it('clears children cache on summary paging', async () => {
      const api = useGroupedAssetList()
      await api.search()
      await api.toggleExpand(GROUP_MULTI)

      await api.changePage(2)

      expect(api.expandedKeys.value).toEqual([])
      expect(api.childrenOf(GROUP_MULTI)).toEqual([])
    })
  })

  describe('singleton stays collapsed (BF-078)', () => {
    it('does not auto-expand groups with asset_count === 1', async () => {
      mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI, SUMMARY_SENTINEL], 2))
      const api = useGroupedAssetList()

      await api.search()

      expect(api.expandedKeys.value).toEqual([])
      expect(api.isExpanded(GROUP_SENTINEL)).toBe(false)
      expect(mockGetGroupChildren).not.toHaveBeenCalled()
    })

    it('does not auto-expand groups with asset_count > 1', async () => {
      mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI], 1))
      const api = useGroupedAssetList()

      await api.search()

      expect(api.expandedKeys.value).toEqual([])
      expect(mockGetGroupChildren).not.toHaveBeenCalled()
    })

    it('single-asset group still expands manually on demand', async () => {
      mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_SENTINEL], 1))
      const api = useGroupedAssetList()
      await api.search()

      await api.toggleExpand(GROUP_SENTINEL)

      expect(api.expandedKeys.value).toEqual([GROUP_SENTINEL])
      expect(childrenCallsFor(GROUP_SENTINEL)).toHaveLength(1)
    })
  })

  describe('children lazy loading and cache', () => {
    it('fetches page 1 on first expand', async () => {
      const api = useGroupedAssetList()
      await api.search()

      await api.toggleExpand(GROUP_MULTI)

      expect(mockGetGroupChildren).toHaveBeenCalledWith({
        group_key: GROUP_MULTI,
        page: 1,
        page_size: 20,
      })
      expect(api.childrenOf(GROUP_MULTI)).toEqual([makeDetail('R1', 'ZC001')])
    })

    it('does not request again on same-group re-expand (cache hit)', async () => {
      const api = useGroupedAssetList()
      await api.search()
      await api.toggleExpand(GROUP_MULTI)
      await api.toggleExpand(GROUP_MULTI)
      vi.clearAllMocks()

      await api.toggleExpand(GROUP_MULTI)

      expect(mockGetGroupChildren).not.toHaveBeenCalled()
      expect(api.isExpanded(GROUP_MULTI)).toBe(true)
    })

    it('appends children on pagination instead of replacing', async () => {
      mockGetGroupChildren.mockResolvedValueOnce(
        paged([makeDetail('R1', 'ZC001'), makeDetail('R2', 'ZC002')], 3, 1, 2),
      )
      const api = useGroupedAssetList({ childPageSize: 2 })
      await api.search()
      await api.toggleExpand(GROUP_MULTI)
      mockGetGroupChildren.mockResolvedValueOnce(paged([makeDetail('R3', 'ZC003')], 3, 2, 2))

      await api.loadMoreChildren(GROUP_MULTI)

      expect(api.childrenOf(GROUP_MULTI).map((row) => row.recordcode)).toEqual(['R1', 'R2', 'R3'])
    })

    it('reports hasMoreChildren from loaded page vs group total', async () => {
      mockGetGroupChildren.mockResolvedValueOnce(paged([makeDetail('R1', 'ZC001')], 3, 1, 2))
      const api = useGroupedAssetList({ childPageSize: 2 })
      await api.search()

      expect(api.hasMoreChildren(GROUP_MULTI)).toBe(true)

      await api.toggleExpand(GROUP_MULTI)
      mockGetGroupChildren.mockResolvedValueOnce(
        paged([makeDetail('R2', 'ZC002'), makeDetail('R3', 'ZC003')], 3, 2, 2),
      )
      await api.loadMoreChildren(GROUP_MULTI)

      expect(api.hasMoreChildren(GROUP_MULTI)).toBe(false)
    })

    it('passes group_key through verbatim, preserving JSON null positions', async () => {
      mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_SENTINEL], 1))
      const api = useGroupedAssetList()
      await api.search()

      await api.toggleExpand(GROUP_SENTINEL)

      expect(mockGetGroupChildren).toHaveBeenCalledWith(
        expect.objectContaining({ group_key: '[null,"投影仪",null,null]' }),
      )
    })

    it('whitelists pass-through filters and strips contract/no_contract', async () => {
      const api = useGroupedAssetList()
      await api.search({
        asset_current_status: 'in_store',
        asset_type_recordcode: 'T01',
        contract_code: 'HT2024-001',
        no_contract: true,
      })
      vi.clearAllMocks()

      await api.toggleExpand(GROUP_MULTI)

      expect(mockGetGroupChildren).toHaveBeenCalledWith({
        group_key: GROUP_MULTI,
        page: 1,
        page_size: 20,
        asset_current_status: 'in_store',
        asset_type_recordcode: 'T01',
      })
    })

    it('9 个非组键筛选逐字透传给组内明细端点，contract_code/no_contract 不外泄', async () => {
      const api = useGroupedAssetList()
      await api.search({
        asset_current_status: 'in_use',
        asset_type_recordcode: 'T01',
        asset_storage_recordcode: 'S01',
        asset_type_category: 'AT_W2',
        asset_code: 'ZC001',
        asset_name: '笔记本',
        asset_brand: 'Lenovo',
        asset_specification: 'X1',
        asset_contract_name: '框架合同',
        contract_code: 'HT2024-001',
        no_contract: true,
      })
      vi.clearAllMocks()

      await api.toggleExpand(GROUP_MULTI)

      expect(mockGetGroupChildren).toHaveBeenCalledWith({
        group_key: GROUP_MULTI,
        page: 1,
        page_size: 20,
        asset_current_status: 'in_use',
        asset_type_recordcode: 'T01',
        asset_storage_recordcode: 'S01',
        asset_type_category: 'AT_W2',
        asset_code: 'ZC001',
        asset_name: '笔记本',
        asset_brand: 'Lenovo',
        asset_specification: 'X1',
        asset_contract_name: '框架合同',
      })
      const sent = mockGetGroupChildren.mock.calls[0][0]
      expect(sent).not.toHaveProperty('contract_code')
      expect(sent).not.toHaveProperty('no_contract')
    })

    it('reports error and keeps cache empty when children request fails', async () => {
      mockGetGroupChildren.mockRejectedValue(new Error('Network error'))
      const api = useGroupedAssetList()
      await api.search()

      await api.toggleExpand(GROUP_MULTI)

      expect(mockElMessageError).toHaveBeenCalledWith('加载组内资产明细失败')
      expect(api.childrenOf(GROUP_MULTI)).toEqual([])
      expect(api.isLoadingChildren(GROUP_MULTI)).toBe(false)
    })
  })

  describe('cascading tri-state selection', () => {
    it('selects every asset_code when a group row is checked', async () => {
      const { search, toggleGroupSelection, selectedCodes, selectedGroupKeys } =
        useGroupedAssetList()
      await search()

      toggleGroupSelection(GROUP_MULTI)

      expect(selectedCodes.value).toEqual(['ZC001', 'ZC002', 'ZC003'])
      expect(selectedGroupKeys.value).toEqual([GROUP_MULTI])
    })

    it('reports indeterminate when only some rows are selected', async () => {
      const { search, toggleRowSelection, isGroupChecked, isGroupIndeterminate } =
        useGroupedAssetList()
      await search()

      toggleRowSelection('ZC002')

      expect(isGroupChecked(GROUP_MULTI)).toBe(false)
      expect(isGroupIndeterminate(GROUP_MULTI)).toBe(true)
    })

    it('promotes indeterminate to fully selected on group toggle', async () => {
      const { search, toggleRowSelection, toggleGroupSelection, isGroupChecked, isRowSelected } =
        useGroupedAssetList()
      await search()
      toggleRowSelection('ZC002')

      toggleGroupSelection(GROUP_MULTI)

      expect(isRowSelected('ZC001')).toBe(true)
      expect(isRowSelected('ZC003')).toBe(true)
      expect(isGroupChecked(GROUP_MULTI)).toBe(true)
    })

    it('clears only the toggled group when a checked group is unchecked', async () => {
      const { search, toggleGroupSelection, toggleRowSelection, selectedCodes } =
        useGroupedAssetList()
      await search()
      toggleGroupSelection(GROUP_MULTI)
      toggleRowSelection('ZC999')

      toggleGroupSelection(GROUP_MULTI)

      expect(selectedCodes.value).toEqual(['ZC999'])
    })

    it('keeps selection flat across summary paging', async () => {
      const api = useGroupedAssetList()
      await api.search()
      api.toggleGroupSelection(GROUP_MULTI)
      vi.clearAllMocks()
      mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI], 10, 2))

      await api.changePage(2)

      expect(api.selectedCodes.value).toEqual(['ZC001', 'ZC002', 'ZC003'])
    })

    it('toggles a single row on and off and clears the selection', async () => {
      const { search, toggleRowSelection, isRowSelected, selectedCodes, clearSelection } =
        useGroupedAssetList()
      await search()

      toggleRowSelection('ZC001')
      expect(isRowSelected('ZC001')).toBe(true)
      toggleRowSelection('ZC001')
      expect(isRowSelected('ZC001')).toBe(false)

      toggleRowSelection('ZC002')
      clearSelection()

      expect(selectedCodes.value).toEqual([])
    })
  })

  // ===== F3 依赖的新原语（setExpanded / childrenPage / setGroupSelection）=====
  describe('F3 primitives', () => {
    it('setExpanded(true) 置位展开，重复调用不再重复请求（幂等）', async () => {
      const api = useGroupedAssetList()
      await api.search()

      await api.setExpanded(GROUP_MULTI, true)
      await api.setExpanded(GROUP_MULTI, true)

      expect(api.isExpanded(GROUP_MULTI)).toBe(true)
      expect(childrenCallsFor(GROUP_MULTI)).toHaveLength(1)
    })

    it('setExpanded(false) 折叠但保留明细缓存，再次展开零请求', async () => {
      const api = useGroupedAssetList()
      await api.search()
      await api.setExpanded(GROUP_MULTI, true)

      await api.setExpanded(GROUP_MULTI, false)
      expect(api.isExpanded(GROUP_MULTI)).toBe(false)
      expect(api.childrenOf(GROUP_MULTI)).toHaveLength(1)

      await api.setExpanded(GROUP_MULTI, true)
      expect(childrenCallsFor(GROUP_MULTI)).toHaveLength(1)
    })

    it('setExpanded 为置位语义而非翻转（与 EP 受控展开配合的关键）', async () => {
      const api = useGroupedAssetList()
      await api.search()

      // 连发两次 true：若误用翻转语义，第二次会折叠
      await api.setExpanded(GROUP_MULTI, true)
      await api.setExpanded(GROUP_MULTI, true)

      expect(api.expandedKeys.value).toEqual([GROUP_MULTI])
    })

    it('childrenPage 随组内翻页推进，未加载过按第 1 页', async () => {
      mockGetGroupChildren.mockResolvedValueOnce(paged([makeDetail('R1', 'ZC001')], 3, 1, 2))
      const api = useGroupedAssetList({ childPageSize: 2 })
      await api.search()

      expect(api.childrenPage(GROUP_MULTI)).toBe(1)

      await api.setExpanded(GROUP_MULTI, true)
      expect(api.childrenPage(GROUP_MULTI)).toBe(1)

      mockGetGroupChildren.mockResolvedValueOnce(
        paged([makeDetail('R2', 'ZC002'), makeDetail('R3', 'ZC003')], 3, 2, 2),
      )
      await api.loadMoreChildren(GROUP_MULTI)

      expect(api.childrenPage(GROUP_MULTI)).toBe(2)
    })

    it('childrenPage 对未加载的组返回第 1 页而非 undefined', () => {
      const api = useGroupedAssetList()
      expect(api.childrenPage('NOT-LOADED')).toBe(1)
    })

    it('setGroupSelection 以明细实际勾选为准重建该组选中态', async () => {
      const api = useGroupedAssetList()
      await api.search()

      api.toggleGroupSelection(GROUP_MULTI)
      expect(api.selectedCodes.value).toEqual(['ZC001', 'ZC002', 'ZC003'])

      api.setGroupSelection(GROUP_MULTI, ['ZC001', 'ZC002'])

      expect(api.selectedCodes.value).toEqual(['ZC001', 'ZC002'])
      expect(api.isGroupChecked(GROUP_MULTI)).toBe(false)
      expect(api.isGroupIndeterminate(GROUP_MULTI)).toBe(true)
    })

    it('setGroupSelection 不触碰其他组的选中态', async () => {
      mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY_MULTI, SUMMARY_SENTINEL], 2))
      const api = useGroupedAssetList()
      await api.search()

      api.toggleGroupSelection(GROUP_MULTI)
      api.toggleGroupSelection(GROUP_SENTINEL)
      expect(api.selectedCodes.value).toHaveLength(4)

      api.setGroupSelection(GROUP_MULTI, [])

      expect(api.isRowSelected('ZC001')).toBe(false)
      expect(api.isRowSelected('ZC004')).toBe(true)
    })

    it('setGroupSelection 对未知 group_key 为空操作', async () => {
      const api = useGroupedAssetList()
      await api.search()
      api.toggleGroupSelection(GROUP_MULTI)

      api.setGroupSelection('NOT-A-GROUP', [])

      expect(api.selectedCodes.value).toEqual(['ZC001', 'ZC002', 'ZC003'])
    })
  })
})
