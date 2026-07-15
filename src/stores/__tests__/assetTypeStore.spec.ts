import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAssetTypeStore } from '../assetTypeStore'

vi.mock('@/api/assetType', () => ({
  assetTypeAPI: {
    getAssetTypes: vi.fn(),
    getAssetTypeByRecordcode: vi.fn(),
    createAssetType: vi.fn(),
    updateAssetType: vi.fn(),
    deleteAssetType: vi.fn(),
    batchDeleteAssetTypes: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('AssetTypeStore', () => {
  let store: ReturnType<typeof useAssetTypeStore>

  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    store = useAssetTypeStore()
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
    it('应该调用API获取资产类型列表', async () => {
      const mockResponse = {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            recordcode: 'AT-001',
            type_name: '电脑',
            type_information: '电脑类资产',
          },
        ],
      }

      const { assetTypeAPI } = await import('@/api/assetType')
      vi.mocked(assetTypeAPI.getAssetTypes).mockResolvedValue(mockResponse)

      await store.getList()

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('AT-001')
      expect(store.list[0].type_name).toBe('电脑')
    })

    it('应该更新分页状态', async () => {
      const { assetTypeAPI } = await import('@/api/assetType')
      vi.mocked(assetTypeAPI.getAssetTypes).mockResolvedValue({
        count: 50,
        next: null,
        previous: null,
        results: [],
      })

      await store.getList({ page: 2, page_size: 10 })

      expect(store.pagination.total).toBe(50)
      expect(store.pagination.page).toBe(2)
      expect(store.pagination.page_size).toBe(10)
    })

    it('应该处理API错误', async () => {
      const { assetTypeAPI } = await import('@/api/assetType')
      vi.mocked(assetTypeAPI.getAssetTypes).mockRejectedValue(new Error('网络错误'))

      await expect(store.getList()).rejects.toThrow('网络错误')
    })
  })

  describe('创建记录', () => {
    it('应该调用API创建资产类型', async () => {
      const mockCreated = {
        recordcode: 'AT-001',
        type_name: '电脑',
        type_information: '电脑类资产',
      }

      const { assetTypeAPI } = await import('@/api/assetType')
      vi.mocked(assetTypeAPI.createAssetType).mockResolvedValue(mockCreated)

      await store.create({ type_name: '电脑', type_information: '电脑类资产' })

      expect(store.list).toHaveLength(1)
      expect(store.list[0].recordcode).toBe('AT-001')
    })

    it('应该处理创建失败', async () => {
      const { assetTypeAPI } = await import('@/api/assetType')
      vi.mocked(assetTypeAPI.createAssetType).mockRejectedValue(new Error('创建失败'))

      await expect(
        store.create({ type_name: '电脑', type_information: '电脑类资产' }),
      ).rejects.toThrow('创建失败')
    })
  })

  describe('删除记录', () => {
    it('应该调用API删除资产类型', async () => {
      const { assetTypeAPI } = await import('@/api/assetType')
      vi.mocked(assetTypeAPI.deleteAssetType).mockResolvedValue()

      await store.remove('AT-001')

      expect(assetTypeAPI.deleteAssetType).toHaveBeenCalledWith('AT-001')
    })
  })
})
