import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOutAssetStore } from '../outAssetStore'

vi.mock('@/api/outAsset', () => ({
  outAssetAPI: {
    getOutAssets: vi.fn(),
    getOutAssetByCode: vi.fn(),
    createOutAsset: vi.fn(),
    updateOutAsset: vi.fn(),
    deleteOutAsset: vi.fn(),
    batchDeleteOutAssets: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('OutAssetStore', () => {
  let store: ReturnType<typeof useOutAssetStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useOutAssetStore()
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
    it('应该调用API获取出库资产列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            recordcode: 'OA-001',
            outasset_name: '出库笔记本',
            out_date: '2026-07-09',
          },
        ],
      }

      const { outAssetAPI } = await import('@/api/outAsset')
      vi.mocked(outAssetAPI.getOutAssets).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('OA-001')
      expect(store.list[0].outasset_name).toBe('出库笔记本')
    })

    it('应该更新分页状态', async () => {
      const { outAssetAPI } = await import('@/api/outAsset')
      vi.mocked(outAssetAPI.getOutAssets).mockResolvedValue({
        count: 45,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 3, page_size: 15 })

      expect(store.pagination.total).toBe(45)
      expect(store.pagination.page).toBe(3)
    })

    it('应该处理API错误', async () => {
      const { outAssetAPI } = await import('@/api/outAsset')
      vi.mocked(outAssetAPI.getOutAssets).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建出库资产', async () => {
      const mockCreated = {
        recordcode: 'OA-001',
        outasset_name: '出库笔记本',
        out_date: '2026-07-09',
      }

      const { outAssetAPI } = await import('@/api/outAsset')
      vi.mocked(outAssetAPI.createOutAsset).mockResolvedValue(mockCreated as any)

      await store.create({
        outasset_name: '出库笔记本',
        out_date: '2026-07-09',
      })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('OA-001')
    })

    it('应该处理创建失败', async () => {
      const { outAssetAPI } = await import('@/api/outAsset')
      vi.mocked(outAssetAPI.createOutAsset).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({ outasset_name: '出库笔记本', out_date: '2026-07-09' }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除出库资产', async () => {
      const { outAssetAPI } = await import('@/api/outAsset')
      vi.mocked(outAssetAPI.deleteOutAsset).mockResolvedValue()

      await store.remove('OA-001')

      expect(outAssetAPI.deleteOutAsset).toHaveBeenCalledWith('OA-001')
    })
  })
})
