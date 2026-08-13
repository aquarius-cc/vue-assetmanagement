import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRepairAssetStore } from '../repairAssetStore'

// Mock依赖模块
vi.mock('@/api/repairAsset', () => ({
  repairAssetAPI: {
    getRepairAssets: vi.fn(),
    getRepairAssetByCode: vi.fn(),
    createRepairAsset: vi.fn(),
    updateRepairAsset: vi.fn(),
    deleteRepairAsset: vi.fn(),
    batchDeleteRepairAssets: vi.fn(),
    repairAsset: vi.fn(),
    repairDone: vi.fn(),
    repairFailed: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('RepairAssetStore', () => {
  let repairAssetStore: ReturnType<typeof useRepairAssetStore>

  beforeEach(() => {
    // 创建新的Pinia实例并激活
    const pinia = createPinia()
    setActivePinia(pinia)
    repairAssetStore = useRepairAssetStore()

    // 清除所有mock调用记录
    vi.clearAllMocks()
  })

  describe('初始化状态', () => {
    it('应该初始化为空列表', () => {
      expect(repairAssetStore.list).toEqual([])
      expect(repairAssetStore.loading).toBe(false)
      expect(repairAssetStore.pagination.total).toBe(0)
    })
  })

  describe('获取列表', () => {
    it('应该调用API获取维修资产列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            recordcode: 'repair-001',
            asset_code: 'asset-001',
            repair_asset_number: 1,
            repair_date: '2026-07-09',
            repair_reason: '测试维修',
            repair_description: '测试描述',
            create_time: '2026-07-09T10:00:00Z',
            update_time: '2026-07-09T10:00:00Z',
            is_deleted: false,
          },
        ],
      }

      const { repairAssetAPI } = await import('@/api/repairAsset')
      vi.mocked(repairAssetAPI.getRepairAssets).mockResolvedValue(mockResponse)

      await repairAssetStore.getList()

      expect(repairAssetStore.list).toHaveLength(1)
      expect(repairAssetStore.list[0].recordcode).toBe('repair-001')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建维修记录', async () => {
      const mockCreated = {
        id: 1,
        recordcode: 'repair-001',
        asset_code: 'asset-001',
        repair_asset_number: 1,
        repair_date: '2026-07-09',
        repair_reason: '测试维修',
        repair_description: '测试描述',
        create_time: '2026-07-09T10:00:00Z',
        update_time: '2026-07-09T10:00:00Z',
        is_deleted: false,
      }

      const { repairAssetAPI } = await import('@/api/repairAsset')
      vi.mocked(repairAssetAPI.createRepairAsset).mockResolvedValue(mockCreated)

      await repairAssetStore.create({
        asset_code: 'asset-001',
        repair_asset_number: 1,
        repair_date: '2026-07-09',
        repair_reason: '测试维修',
      })

      expect(repairAssetStore.list).toHaveLength(1)
      expect(repairAssetStore.list[0].recordcode).toBe('repair-001')
    })

    it('应该处理创建失败的情况', async () => {
      const { repairAssetAPI } = await import('@/api/repairAsset')
      vi.mocked(repairAssetAPI.createRepairAsset).mockRejectedValue(new Error('创建失败'))

      await expect(
        repairAssetStore.create({
          asset_code: 'asset-001',
          repair_asset_number: 1,
          repair_date: '2026-07-09',
          repair_reason: '测试维修',
        }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除维修记录', async () => {
      const { repairAssetAPI } = await import('@/api/repairAsset')
      vi.mocked(repairAssetAPI.deleteRepairAsset).mockResolvedValue()

      await repairAssetStore.remove('repair-001')

      expect(repairAssetAPI.deleteRepairAsset).toHaveBeenCalledWith('repair-001')
    })
  })

  describe('详情/更新/批量删除', () => {
    it('应该调用API获取详情', async () => {
      const { repairAssetAPI } = await import('@/api/repairAsset')
      vi.mocked(repairAssetAPI.getRepairAssetByCode).mockResolvedValue({
        recordcode: 'repair-001',
      } as never)

      const result = await repairAssetStore.getById('repair-001')

      expect(result).toBeDefined()
    })

    it('应该调用API更新记录', async () => {
      const { repairAssetAPI } = await import('@/api/repairAsset')
      vi.mocked(repairAssetAPI.updateRepairAsset).mockResolvedValue({
        recordcode: 'repair-001',
      } as never)

      await repairAssetStore.update({ recordcode: 'repair-001' } as never)

      expect(repairAssetAPI.updateRepairAsset).toHaveBeenCalled()
    })

    it('应该调用API批量删除', async () => {
      const { repairAssetAPI } = await import('@/api/repairAsset')
      vi.mocked(repairAssetAPI.batchDeleteRepairAssets).mockResolvedValue({
        total: 1,
        success_count: 1,
        fail_count: 0,
        success_ids: ['repair-001'],
        fail_items: [],
      })

      await repairAssetStore.removeBatch(['repair-001'])

      expect(repairAssetAPI.batchDeleteRepairAssets).toHaveBeenCalledWith(['repair-001'])
    })
  })
})
