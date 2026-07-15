import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRecycleAssetStore } from '../recycleAssetStore'

vi.mock('@/api/recycleAsset', () => ({
  recycleAssetAPI: {
    getRecycleAssets: vi.fn(),
    getRecycleAssetByCode: vi.fn(),
    createRecycleAsset: vi.fn(),
    updateRecycleAsset: vi.fn(),
    deleteRecycleAsset: vi.fn(),
    batchDeleteRecycleAssets: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('RecycleAssetStore', () => {
  let store: ReturnType<typeof useRecycleAssetStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useRecycleAssetStore()
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
    it('应该调用API获取回收资产列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            recordcode: 'RC-001',
            recycle_asset_name: '回收笔记本',
            recycle_date: '2026-07-09',
          },
        ],
      }

      const { recycleAssetAPI } = await import('@/api/recycleAsset')
      vi.mocked(recycleAssetAPI.getRecycleAssets).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('RC-001')
      expect(store.list[0].recycle_asset_name).toBe('回收笔记本')
    })

    it('应该更新分页状态', async () => {
      const { recycleAssetAPI } = await import('@/api/recycleAsset')
      vi.mocked(recycleAssetAPI.getRecycleAssets).mockResolvedValue({
        count: 35,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 2, page_size: 20 })

      expect(store.pagination.total).toBe(35)
      expect(store.pagination.page).toBe(2)
    })

    it('应该处理API错误', async () => {
      const { recycleAssetAPI } = await import('@/api/recycleAsset')
      vi.mocked(recycleAssetAPI.getRecycleAssets).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建回收资产', async () => {
      const mockCreated = {
        recordcode: 'RC-001',
        recycle_asset_name: '回收笔记本',
        recycle_date: '2026-07-09',
      }

      const { recycleAssetAPI } = await import('@/api/recycleAsset')
      vi.mocked(recycleAssetAPI.createRecycleAsset).mockResolvedValue(mockCreated as any)

      await store.create({
        recycle_asset_name: '回收笔记本',
        recycle_date: '2026-07-09',
      })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('RC-001')
    })

    it('应该处理创建失败', async () => {
      const { recycleAssetAPI } = await import('@/api/recycleAsset')
      vi.mocked(recycleAssetAPI.createRecycleAsset).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({ recycle_asset_name: '回收笔记本', recycle_date: '2026-07-09' }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除回收资产', async () => {
      const { recycleAssetAPI } = await import('@/api/recycleAsset')
      vi.mocked(recycleAssetAPI.deleteRecycleAsset).mockResolvedValue()

      await store.remove('RC-001')

      expect(recycleAssetAPI.deleteRecycleAsset).toHaveBeenCalledWith('RC-001')
    })
  })
})
