/**
 * [M-20] 分页默认值单源（DEFAULT_PAGE_SIZE / withPaginationDefaults）。
 * 祖治源：stores/assetStore.ts:144-147 无参回落 page_size:10 vs :173 defaultPageSize:20 双源；
 * helper 落工厂 createEntityStore（19 store 本就从此导入，零新增导入路径），
 * 常量留 utils/pagination.ts（DR-4，该文件零 import 无循环）。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { withPaginationDefaults } from '../createEntityStore'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/utils/pagination'

vi.mock('@/api/lostAsset', () => ({
  lostAssetAPI: {
    getLostAssets: vi.fn().mockResolvedValue({ count: 0, next: null, previous: null, results: [] }),
    getLostAssetByCode: vi.fn(),
    createLostAsset: vi.fn(),
    updateLostAsset: vi.fn(),
    deleteLostAsset: vi.fn(),
    batchDeleteLostAssets: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

describe('M-20 分页默认值单源', () => {
  it('withPaginationDefaults() 零参 → 兜底 { page: 1, page_size: DEFAULT_PAGE_SIZE }（证红锚）', () => {
    expect(withPaginationDefaults()).toEqual({ page: 1, page_size: DEFAULT_PAGE_SIZE })
    expect(withPaginationDefaults(undefined)).toEqual({ page: 1, page_size: DEFAULT_PAGE_SIZE })
  })

  it('传参原样返回：不覆写 page_size、保留额外键（空对象也原样）', () => {
    expect(withPaginationDefaults({ page: 2, page_size: 5 })).toEqual({
      page: 2,
      page_size: 5,
    })
    expect(withPaginationDefaults({ page: 3, page_size: 5, keyword: 'x' })).toEqual({
      page: 3,
      page_size: 5,
      keyword: 'x',
    })
    expect(withPaginationDefaults({})).toEqual({})
  })

  it('DEFAULT_PAGE_SIZE === PAGE_SIZE_OPTIONS[0]（两常量不各自漂移）', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(PAGE_SIZE_OPTIONS[0])
    expect(DEFAULT_PAGE_SIZE).toBe(20)
  })

  it('工厂零参兜底锚：store.getList() → API 收 page_size: 20（工厂本已兜，防回退）', async () => {
    const { useLostAssetStore } = await import('../lostAssetStore')
    const lostAssetAPI = (await import('@/api/lostAsset')).lostAssetAPI
    setActivePinia(createPinia())
    const store = useLostAssetStore()
    await store.getList()
    expect(lostAssetAPI.getLostAssets).toHaveBeenCalledWith({ page: 1, page_size: 20 })
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })
})
