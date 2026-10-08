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

import { useGroupedAssetList } from '../useGroupedAssetList'
import { useGroupedSessionRestore } from '../useGroupedSessionRestore'
import type { GroupedPageSnapshot } from '@/stores/groupedAssetSession'
import type { AssetDetail, AssetGroupSummary, PaginatedResponse } from '@/types/asset'

const GROUP_KEY = '["HT2024-001","笔记本","ThinkPad X1","Lenovo"]'

function makeSummary(overrides: Partial<AssetGroupSummary> = {}): AssetGroupSummary {
  return {
    group_key: GROUP_KEY,
    contract_code: 'HT2024-001',
    asset_name: '笔记本',
    asset_specification: 'ThinkPad X1',
    asset_brand: 'Lenovo',
    asset_count: 3,
    price_display: '¥12,000.00',
    asset_codes: ['ZC001', 'ZC002', 'ZC003'],
    ...overrides,
  } as AssetGroupSummary
}

function makeDetail(recordcode: string, asset_code: string): AssetDetail {
  return { recordcode, asset_code } as AssetDetail
}

function paged<T>(results: T[], count = results.length): PaginatedResponse<T> {
  return { count, next: null, previous: null, results } as PaginatedResponse<T>
}

const SUMMARY = makeSummary()

function makeHarness() {
  const api = useGroupedAssetList()
  // changePage 过 spy：直接断言「是否被调用」。仅靠 getGroupedAssets 调用数无法
  // 区分 page=1 时的冗余 changePage(1)（其内部 page===currentPage 守卫会早退、
  // 零请求），等价突变体（if(true) / >=1）必须由调用断言杀死。
  const changePageSpy = vi.fn(api.changePage)
  const { restore } = useGroupedSessionRestore({
    search: api.search,
    changePage: changePageSpy,
    setExpanded: api.setExpanded,
    goToChildPage: api.goToChildPage,
    selectedCodes: api.selectedCodes,
  })
  return { api, restore, changePageSpy }
}

function snapshot(overrides: Partial<GroupedPageSnapshot> = {}): GroupedPageSnapshot {
  return {
    filters: {},
    page: 1,
    expandedKeys: [],
    childPages: {},
    selectedCodes: [],
    scrollTop: 0,
    ...overrides,
  }
}

describe('useGroupedSessionRestore（BF-078 需求3 顺序契约）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGroupedAssets.mockResolvedValue(paged([SUMMARY]))
    mockGetGroupChildren.mockResolvedValue(paged([makeDetail('R1', 'ZC001')]))
  })

  it('终态屏障：存档筛选+存档页进汇总请求，展开/子表页/选中集全部回放', async () => {
    const { api, restore, changePageSpy } = makeHarness()

    await restore(
      snapshot({
        filters: { asset_current_status: 'in_store' },
        page: 2,
        expandedKeys: [GROUP_KEY],
        childPages: { [GROUP_KEY]: 2 },
        selectedCodes: ['ZC001', 'ZC002'],
      }),
    )

    const lastCall = mockGetGroupedAssets.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(lastCall).toMatchObject({ asset_current_status: 'in_store', page: 2 })
    expect(changePageSpy).toHaveBeenCalledWith(2)
    expect(api.currentPage.value).toBe(2)
    expect(api.expandedKeys.value).toEqual([GROUP_KEY])
    expect(api.childrenPage(GROUP_KEY)).toBe(2)
    expect(api.selectedCodes.value).toEqual(['ZC001', 'ZC002'])
  })

  it('时序屏障：汇总请求 pending 期间展开键必为空（先 fetch 后 replay，防 reset 抹键）', async () => {
    let resolveFetch!: (value: PaginatedResponse<AssetGroupSummary>) => void
    mockGetGroupedAssets.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )
    const { api, restore } = makeHarness()

    const pending = restore(snapshot({ expandedKeys: [GROUP_KEY] }))
    await Promise.resolve()
    expect(api.expandedKeys.value).toEqual([])

    resolveFetch(paged([SUMMARY]))
    await pending
    expect(api.expandedKeys.value).toEqual([GROUP_KEY])
  })

  it('子表页码：childPages page=1 零额外请求（首载默认即 1）', async () => {
    const { restore } = makeHarness()

    await restore(snapshot({ expandedKeys: [GROUP_KEY], childPages: { [GROUP_KEY]: 1 } }))

    expect(mockGetGroupChildren).toHaveBeenCalledTimes(1)
    expect(mockGetGroupChildren.mock.calls[0]?.[0]).toMatchObject({ group_key: GROUP_KEY, page: 1 })
  })

  it('子表页码：非展开组的 childPages 条目被忽略（键域与展开态一致）', async () => {
    const { api, restore } = makeHarness()

    await restore(snapshot({ childPages: { [GROUP_KEY]: 3 } }))

    expect(mockGetGroupChildren).not.toHaveBeenCalled()
    expect(api.expandedKeys.value).toEqual([])
  })

  it('page=1 不触发 changePage（等价突变杀手：if(true) / >=1 会调用而被断言击毙）', async () => {
    const { restore, changePageSpy } = makeHarness()

    await restore(snapshot({ page: 1 }))

    expect(changePageSpy).not.toHaveBeenCalled()
    expect(mockGetGroupedAssets).toHaveBeenCalledTimes(1)
  })
})
