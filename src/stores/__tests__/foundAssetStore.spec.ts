import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFoundAssetStore } from '../foundAssetStore'

vi.mock('@/api/foundAsset', () => ({
  foundAssetAPI: {
    getFoundAssets: vi.fn(),
    getFoundAssetByCode: vi.fn(),
    createFoundAsset: vi.fn(),
    updateFoundAsset: vi.fn(),
    deleteFoundAsset: vi.fn(),
    batchDeleteFoundAssets: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('FoundAssetStore', () => {
  let store: ReturnType<typeof useFoundAssetStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useFoundAssetStore()
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
    it('应该调用API获取拾得资产列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            recordcode: 'FA-001',
            asset_name: '笔记本电脑',
            found_date: '2026-07-09',
          },
        ],
      }

      const { foundAssetAPI } = await import('@/api/foundAsset')
      vi.mocked(foundAssetAPI.getFoundAssets).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('FA-001')
      expect(store.list[0].asset_name).toBe('笔记本电脑')
    })

    it('应该更新分页状态', async () => {
      const { foundAssetAPI } = await import('@/api/foundAsset')
      vi.mocked(foundAssetAPI.getFoundAssets).mockResolvedValue({
        count: 30,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 2, page_size: 10 })

      expect(store.pagination.total).toBe(30)
      expect(store.pagination.page).toBe(2)
    })

    it('应该处理API错误', async () => {
      const { foundAssetAPI } = await import('@/api/foundAsset')
      vi.mocked(foundAssetAPI.getFoundAssets).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建拾得资产', async () => {
      const mockCreated = {
        recordcode: 'FA-001',
        asset_name: '笔记本电脑',
        found_date: '2026-07-09',
      }

      const { foundAssetAPI } = await import('@/api/foundAsset')
      vi.mocked(foundAssetAPI.createFoundAsset).mockResolvedValue(mockCreated)

      await store.create({ asset_name: '笔记本电脑', found_date: '2026-07-09' })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('FA-001')
    })

    it('应该处理创建失败', async () => {
      const { foundAssetAPI } = await import('@/api/foundAsset')
      vi.mocked(foundAssetAPI.createFoundAsset).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({ asset_name: '笔记本电脑', found_date: '2026-07-09' }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除拾得资产', async () => {
      const { foundAssetAPI } = await import('@/api/foundAsset')
      vi.mocked(foundAssetAPI.deleteFoundAsset).mockResolvedValue()

      await store.remove('FA-001')

      expect(foundAssetAPI.deleteFoundAsset).toHaveBeenCalledWith('FA-001')
    })
  })
})
