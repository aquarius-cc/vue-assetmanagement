import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBrokenAssetStore } from '../brokenAssetStore'

vi.mock('@/api/brokenAsset', () => ({
  brokenAssetAPI: {
    getBrokenAssets: vi.fn(),
    getBrokenAssetByCode: vi.fn(),
    createBrokenAsset: vi.fn(),
    updateBrokenAsset: vi.fn(),
    deleteBrokenAsset: vi.fn(),
    batchDeleteBrokenAssets: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('BrokenAssetStore', () => {
  let store: ReturnType<typeof useBrokenAssetStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useBrokenAssetStore()
    vi.clearAllMocks()
  })

  describe('初始化状态', () => {
    it('应该初始化为空列表', () => {
      expect(store.list).toEqual([])
      expect(store.loading).toBe(false)
      expect(store.pagination.total).toBe(0)
    })
  })

  describe('获取列表', () => {
    it('应该调用API获取损坏资产列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            recordcode: 'BA-001',
            asset_name: '损坏显示器',
            broken_date: '2026-07-09',
          },
        ],
      }

      const { brokenAssetAPI } = await import('@/api/brokenAsset')
      vi.mocked(brokenAssetAPI.getBrokenAssets).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('BA-001')
      expect(store.list[0].asset_name).toBe('损坏显示器')
    })

    it('应该更新分页状态', async () => {
      const { brokenAssetAPI } = await import('@/api/brokenAsset')
      vi.mocked(brokenAssetAPI.getBrokenAssets).mockResolvedValue({
        count: 25,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 3, page_size: 10 })

      expect(store.pagination.total).toBe(25)
      expect(store.pagination.page).toBe(3)
    })

    it('应该处理API错误', async () => {
      const { brokenAssetAPI } = await import('@/api/brokenAsset')
      vi.mocked(brokenAssetAPI.getBrokenAssets).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建损坏资产', async () => {
      const mockCreated = {
        recordcode: 'BA-001',
        asset_name: '损坏显示器',
        broken_date: '2026-07-09',
      }

      const { brokenAssetAPI } = await import('@/api/brokenAsset')
      vi.mocked(brokenAssetAPI.createBrokenAsset).mockResolvedValue(mockCreated)

      await store.create({ asset_name: '损坏显示器', broken_date: '2026-07-09' })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('BA-001')
    })

    it('应该处理创建失败', async () => {
      const { brokenAssetAPI } = await import('@/api/brokenAsset')
      vi.mocked(brokenAssetAPI.createBrokenAsset).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({ asset_name: '损坏显示器', broken_date: '2026-07-09' }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除损坏资产', async () => {
      const { brokenAssetAPI } = await import('@/api/brokenAsset')
      vi.mocked(brokenAssetAPI.deleteBrokenAsset).mockResolvedValue()

      await store.remove('BA-001')

      expect(brokenAssetAPI.deleteBrokenAsset).toHaveBeenCalledWith('BA-001')
    })
  })
})
