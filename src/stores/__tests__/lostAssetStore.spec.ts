import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLostAssetStore } from '../lostAssetStore'

// Mock依赖模块
vi.mock('@/api/lostAsset', () => ({
  lostAssetAPI: {
    getLostAssets: vi.fn(),
    getLostAssetByCode: vi.fn(),
    createLostAsset: vi.fn(),
    updateLostAsset: vi.fn(),
    deleteLostAsset: vi.fn(),
    batchDeleteLostAssets: vi.fn(),
    markAssetAsLost: vi.fn(),
    foundAsset: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('LostAssetStore', () => {
  let lostAssetStore: ReturnType<typeof useLostAssetStore>

  beforeEach(() => {
    // 创建新的Pinia实例并激活
    const pinia = createPinia()
    setActivePinia(pinia)
    lostAssetStore = useLostAssetStore()

    // 清除所有mock调用记录
    vi.clearAllMocks()
  })

  describe('初始化状态', () => {
    it('应该初始化为空列表', () => {
      expect(lostAssetStore.list).toEqual([])
      expect(lostAssetStore.loading).toBe(false)
      expect(lostAssetStore.pagination.total).toBe(0)
    })
  })

  describe('获取列表', () => {
    it('应该调用API获取遗失资产列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            recordcode: 'lost-001',
            asset_code: 'asset-001',
            lost_asset_number: 1,
            lost_date: '2026-07-09',
            lost_reason: '测试遗失',
            lost_description: '测试描述',
            create_time: '2026-07-09T10:00:00Z',
            update_time: '2026-07-09T10:00:00Z',
            is_deleted: false,
          },
        ],
      }

      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.getLostAssets).mockResolvedValue(mockResponse)

      await lostAssetStore.getList()

      expect(lostAssetStore.list).toHaveLength(1)
      expect(lostAssetStore.list[0].recordcode).toBe('lost-001')
    })

    it('无参数时应使用默认分页', async () => {
      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.getLostAssets).mockResolvedValue({
        count: 0,
        results: [],
      })

      await lostAssetStore.getList()

      expect(lostAssetAPI.getLostAssets).toHaveBeenCalledWith({
        page: 1,
        page_size: 20,
      })
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建遗失记录', async () => {
      const mockCreated = {
        id: 1,
        recordcode: 'lost-001',
        asset_code: 'asset-001',
        lost_asset_number: 1,
        lost_date: '2026-07-09',
        lost_reason: '测试遗失',
        lost_description: '测试描述',
        create_time: '2026-07-09T10:00:00Z',
        update_time: '2026-07-09T10:00:00Z',
        is_deleted: false,
      }

      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.createLostAsset).mockResolvedValue(mockCreated)

      await lostAssetStore.create({
        asset_code: 'asset-001',
        lost_asset_number: 1,
        lost_date: '2026-07-09',
        lost_reason: '测试遗失',
      })

      expect(lostAssetStore.list).toHaveLength(1)
      expect(lostAssetStore.list[0].recordcode).toBe('lost-001')
    })

    it('应该处理创建失败的情况', async () => {
      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.createLostAsset).mockRejectedValue(new Error('创建失败'))

      await expect(
        lostAssetStore.create({
          asset_code: 'asset-001',
          lost_asset_number: 1,
          lost_date: '2026-07-09',
          lost_reason: '测试遗失',
        }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除遗失记录', async () => {
      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.deleteLostAsset).mockResolvedValue()

      await lostAssetStore.remove('lost-001')

      expect(lostAssetAPI.deleteLostAsset).toHaveBeenCalledWith('lost-001')
    })
  })

  describe('详情/更新/批量删除', () => {
    it('应该调用API获取详情', async () => {
      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.getLostAssetByCode).mockResolvedValue({
        recordcode: 'lost-001',
      } as never)

      const result = await lostAssetStore.getById('lost-001')

      expect(result).toBeDefined()
    })

    it('应该调用API更新记录', async () => {
      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.updateLostAsset).mockResolvedValue({
        recordcode: 'lost-001',
      } as never)

      await lostAssetStore.update({ recordcode: 'lost-001', asset_name: '新名称' } as never)

      expect(lostAssetAPI.updateLostAsset).toHaveBeenCalled()
    })

    it('应该调用API批量删除', async () => {
      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.batchDeleteLostAssets).mockResolvedValue({
        total: 1,
        success_count: 1,
        fail_count: 0,
        success_ids: ['lost-001'],
        fail_items: [],
      })

      await lostAssetStore.removeBatch(['lost-001'])

      expect(lostAssetAPI.batchDeleteLostAssets).toHaveBeenCalledWith(['lost-001'])
    })
  })

  describe('状态流转', () => {
    it('markAssetAsLost应该调用API并透传数据', async () => {
      const mockResult = { recordcode: 'lost-001', asset_status: 'lost' }
      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.markAssetAsLost).mockResolvedValue(mockResult as never)

      const params = {
        lost_reason: '办公室搬迁遗失',
        last_known_location: '旧办公区',
      }
      const result = await lostAssetStore.markAssetAsLost('asset-001', params)

      expect(result).toEqual(mockResult)
      expect(lostAssetAPI.markAssetAsLost).toHaveBeenCalledWith('asset-001', params)
    })

    it('markAssetAsLost API失败时应抛出异常', async () => {
      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.markAssetAsLost).mockRejectedValue(new Error('标记遗失失败'))

      await expect(
        lostAssetStore.markAssetAsLost('asset-001', { lost_reason: '遗失' }),
      ).rejects.toThrow('标记遗失失败')
    })

    it('foundAsset应该调用API并透传找回信息', async () => {
      const mockResult = { recordcode: 'lost-001', asset_status: 'found' }
      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.foundAsset).mockResolvedValue(mockResult as never)

      const params = { found_location: '仓库A', found_description: '已找回' }
      const result = await lostAssetStore.foundAsset('asset-001', params)

      expect(result).toEqual(mockResult)
      expect(lostAssetAPI.foundAsset).toHaveBeenCalledWith('asset-001', params)
    })

    it('foundAsset API失败时应抛出异常', async () => {
      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.foundAsset).mockRejectedValue(new Error('找回失败'))

      await expect(lostAssetStore.foundAsset('asset-001', {})).rejects.toThrow('找回失败')
    })

    it('同一Pinia实例下二次调用应复用已有扩展action', async () => {
      lostAssetStore.markAssetAsLost('asset-001', { lost_reason: '遗失' }).catch(() => undefined)
      const { lostAssetAPI } = await import('@/api/lostAsset')
      vi.mocked(lostAssetAPI.markAssetAsLost).mockResolvedValue({
        recordcode: 'lost-001',
      } as never)

      const second = useLostAssetStore()
      await second.markAssetAsLost('asset-002', { lost_reason: '再遗失' })

      expect(second).toBeDefined()
      expect(second.markAssetAsLost).toBe(lostAssetStore.markAssetAsLost)
    })
  })
})
