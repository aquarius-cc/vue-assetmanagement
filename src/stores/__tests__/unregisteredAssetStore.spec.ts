import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUnregisteredAssetStore } from '../unregisteredAssetStore'

vi.mock('@/api/unregisteredAsset', () => ({
  unregisteredAssetAPI: {
    getUnregisteredAssets: vi.fn(),
    getUnregisteredAsset: vi.fn(),
    createUnregisteredAsset: vi.fn(),
    updateUnregisteredAsset: vi.fn(),
    deleteUnregisteredAsset: vi.fn(),
    batchDeleteUnregisteredAssets: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('UnregisteredAssetStore', () => {
  let store: ReturnType<typeof useUnregisteredAssetStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useUnregisteredAssetStore()
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
    it('应该调用API获取未登记资产列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            code: 'UNR-001',
            asset_name: '未登记设备',
          },
        ],
      }

      const { unregisteredAssetAPI } = await import('@/api/unregisteredAsset')
      vi.mocked(unregisteredAssetAPI.getUnregisteredAssets).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].code).toBe('UNR-001')
      expect(store.list[0].asset_name).toBe('未登记设备')
    })

    it('应该更新分页状态', async () => {
      const { unregisteredAssetAPI } = await import('@/api/unregisteredAsset')
      vi.mocked(unregisteredAssetAPI.getUnregisteredAssets).mockResolvedValue({
        count: 60,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 3, page_size: 20 })

      expect(store.pagination.total).toBe(60)
      expect(store.pagination.page).toBe(3)
    })

    it('应该处理API错误', async () => {
      const { unregisteredAssetAPI } = await import('@/api/unregisteredAsset')
      vi.mocked(unregisteredAssetAPI.getUnregisteredAssets).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建未登记资产', async () => {
      const mockCreated = {
        code: 'UNR-001',
        asset_name: '未登记设备',
      }

      const { unregisteredAssetAPI } = await import('@/api/unregisteredAsset')
      vi.mocked(unregisteredAssetAPI.createUnregisteredAsset).mockResolvedValue(mockCreated as any)

      await store.create({ asset_name: '未登记设备' })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].code).toBe('UNR-001')
    })

    it('应该处理创建失败', async () => {
      const { unregisteredAssetAPI } = await import('@/api/unregisteredAsset')
      vi.mocked(unregisteredAssetAPI.createUnregisteredAsset).mockRejectedValue(
        new Error('创建失败'),
      )

      await expect(store.create({ asset_name: '未登记设备' })).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除未登记资产', async () => {
      const { unregisteredAssetAPI } = await import('@/api/unregisteredAsset')
      vi.mocked(unregisteredAssetAPI.deleteUnregisteredAsset).mockResolvedValue()

      await store.remove('UNR-001')

      expect(unregisteredAssetAPI.deleteUnregisteredAsset).toHaveBeenCalledWith('UNR-001')
    })
  })
})
