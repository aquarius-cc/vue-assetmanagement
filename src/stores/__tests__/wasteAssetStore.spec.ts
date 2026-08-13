import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWasteAssetStore } from '../wasteAssetStore'

vi.mock('@/api/wasteAsset', () => ({
  wasteAssetAPI: {
    getWasteAssets: vi.fn(),
    getWasteAsset: vi.fn(),
    createWasteAsset: vi.fn(),
    updateWasteAsset: vi.fn(),
    deleteWasteAsset: vi.fn(),
    batchDeleteWasteAssets: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('WasteAssetStore', () => {
  let store: ReturnType<typeof useWasteAssetStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useWasteAssetStore()
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
    it('应该调用API获取报废资产列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            asset_code: 'WA-001',
            asset_name: '报废电脑',
            waste_date: '2026-07-09',
          },
        ],
      }

      const { wasteAssetAPI } = await import('@/api/wasteAsset')
      vi.mocked(wasteAssetAPI.getWasteAssets).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].asset_code).toBe('WA-001')
      expect(store.list[0].asset_name).toBe('报废电脑')
    })

    it('应该更新分页状态', async () => {
      const { wasteAssetAPI } = await import('@/api/wasteAsset')
      vi.mocked(wasteAssetAPI.getWasteAssets).mockResolvedValue({
        count: 80,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 4, page_size: 20 })

      expect(store.pagination.total).toBe(80)
      expect(store.pagination.page).toBe(4)
    })

    it('应该处理API错误', async () => {
      const { wasteAssetAPI } = await import('@/api/wasteAsset')
      vi.mocked(wasteAssetAPI.getWasteAssets).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建报废资产', async () => {
      const mockCreated = {
        asset_code: 'WA-001',
        asset_name: '报废电脑',
        waste_date: '2026-07-09',
      }

      const { wasteAssetAPI } = await import('@/api/wasteAsset')
      vi.mocked(wasteAssetAPI.createWasteAsset).mockResolvedValue(mockCreated as any)

      await store.create({
        asset_name: '报废电脑',
        waste_date: '2026-07-09',
      })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].asset_code).toBe('WA-001')
    })

    it('应该处理创建失败', async () => {
      const { wasteAssetAPI } = await import('@/api/wasteAsset')
      vi.mocked(wasteAssetAPI.createWasteAsset).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({ asset_name: '报废电脑', waste_date: '2026-07-09' }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除报废资产', async () => {
      const { wasteAssetAPI } = await import('@/api/wasteAsset')
      vi.mocked(wasteAssetAPI.deleteWasteAsset).mockResolvedValue()

      await store.remove('WA-001')

      expect(wasteAssetAPI.deleteWasteAsset).toHaveBeenCalledWith('WA-001')
    })
  })

  describe('详情/更新/批量删除', () => {
    it('应该调用API获取详情', async () => {
      const { wasteAssetAPI } = await import('@/api/wasteAsset')
      vi.mocked(wasteAssetAPI.getWasteAsset).mockResolvedValue({
        asset_code: 'WA-001',
      } as never)

      const result = await store.getById('WA-001')

      expect(result).toBeDefined()
    })

    it('应该调用API更新记录', async () => {
      const { wasteAssetAPI } = await import('@/api/wasteAsset')
      vi.mocked(wasteAssetAPI.updateWasteAsset).mockResolvedValue({
        asset_code: 'WA-001',
      } as never)

      await store.update({ asset_code: 'WA-001' } as never)

      expect(wasteAssetAPI.updateWasteAsset).toHaveBeenCalled()
    })

    it('应该调用API批量删除', async () => {
      const { wasteAssetAPI } = await import('@/api/wasteAsset')
      vi.mocked(wasteAssetAPI.batchDeleteWasteAssets).mockResolvedValue({
        total: 1,
        success_count: 1,
        fail_count: 0,
        success_ids: ['WA-001'],
        fail_items: [],
      })

      await store.removeBatch(['WA-001'])

      expect(wasteAssetAPI.batchDeleteWasteAssets).toHaveBeenCalledWith(['WA-001'])
    })
  })
})
