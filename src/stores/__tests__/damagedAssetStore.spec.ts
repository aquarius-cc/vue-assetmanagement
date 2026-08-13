import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDamagedAssetStore } from '../damagedAssetStore'

vi.mock('@/api/damagedAsset', () => ({
  damagedAssetAPI: {
    getDamagedAssets: vi.fn(),
    getDamagedAsset: vi.fn(),
    createDamagedAsset: vi.fn(),
    updateDamagedAsset: vi.fn(),
    deleteDamagedAsset: vi.fn(),
    batchDeleteDamagedAssets: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('DamagedAssetStore', () => {
  let store: ReturnType<typeof useDamagedAssetStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useDamagedAssetStore()
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
    it('应该调用API获取待报废资产列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            damaged_asset: 'DA-001',
            damaged_asset_name: '待报废电脑',
            damaged_date: '2026-07-09',
          },
        ],
      }

      const { damagedAssetAPI } = await import('@/api/damagedAsset')
      vi.mocked(damagedAssetAPI.getDamagedAssets).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].damaged_asset).toBe('DA-001')
      expect(store.list[0].damaged_asset_name).toBe('待报废电脑')
    })

    it('应该更新分页状态', async () => {
      const { damagedAssetAPI } = await import('@/api/damagedAsset')
      vi.mocked(damagedAssetAPI.getDamagedAssets).mockResolvedValue({
        count: 30,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 2, page_size: 15 })

      expect(store.pagination.total).toBe(30)
      expect(store.pagination.page).toBe(2)
    })

    it('应该处理API错误', async () => {
      const { damagedAssetAPI } = await import('@/api/damagedAsset')
      vi.mocked(damagedAssetAPI.getDamagedAssets).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建待报废资产', async () => {
      const mockCreated = {
        damaged_asset: 'DA-001',
        damaged_asset_name: '待报废电脑',
        damaged_date: '2026-07-09',
      }

      const { damagedAssetAPI } = await import('@/api/damagedAsset')
      vi.mocked(damagedAssetAPI.createDamagedAsset).mockResolvedValue(mockCreated as any)

      await store.create({
        damaged_asset_name: '待报废电脑',
        damaged_date: '2026-07-09',
      })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].damaged_asset).toBe('DA-001')
    })

    it('应该处理创建失败', async () => {
      const { damagedAssetAPI } = await import('@/api/damagedAsset')
      vi.mocked(damagedAssetAPI.createDamagedAsset).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({ damaged_asset_name: '待报废电脑', damaged_date: '2026-07-09' }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除待报废资产', async () => {
      const { damagedAssetAPI } = await import('@/api/damagedAsset')
      vi.mocked(damagedAssetAPI.deleteDamagedAsset).mockResolvedValue()

      await store.remove('DA-001')

      expect(damagedAssetAPI.deleteDamagedAsset).toHaveBeenCalledWith('DA-001')
    })
  })

  describe('详情/更新/批量删除', () => {
    it('应该调用API获取详情', async () => {
      const { damagedAssetAPI } = await import('@/api/damagedAsset')
      vi.mocked(damagedAssetAPI.getDamagedAsset).mockResolvedValue({
        damaged_asset: 'DA-001',
      } as never)

      const result = await store.getById('DA-001')

      expect(result).toBeDefined()
    })

    it('应该调用API更新记录', async () => {
      const { damagedAssetAPI } = await import('@/api/damagedAsset')
      vi.mocked(damagedAssetAPI.updateDamagedAsset).mockResolvedValue({
        damaged_asset: 'DA-001',
      } as never)

      await store.update({ damaged_asset: 'DA-001' } as never)

      expect(damagedAssetAPI.updateDamagedAsset).toHaveBeenCalled()
    })

    it('应该调用API批量删除', async () => {
      const { damagedAssetAPI } = await import('@/api/damagedAsset')
      vi.mocked(damagedAssetAPI.batchDeleteDamagedAssets).mockResolvedValue({
        total: 1,
        success_count: 1,
        fail_count: 0,
        success_ids: ['DA-001'],
        fail_items: [],
      })

      await store.removeBatch(['DA-001'])

      expect(damagedAssetAPI.batchDeleteDamagedAssets).toHaveBeenCalledWith(['DA-001'])
    })
  })
})
